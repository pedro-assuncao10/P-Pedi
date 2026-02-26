from rest_framework import serializers
from .models import Pedido, ItemPedido
from clientes.models import Endereco
from carrinho.cart import Cart

class ItemPedidoSerializer(serializers.ModelSerializer):
    """
    Serializer para os itens dentro de um pedido (somente leitura).
    """
    produto_nome = serializers.SerializerMethodField()

    class Meta:
        model = ItemPedido
        # Adicionado 'observacao' nos fields
        fields = ['produto_nome', 'preco_unitario', 'quantidade', 'get_custo_total', 'observacao']

    def get_produto_nome(self, obj):
        return obj.produto.nome if obj.produto else "Produto Indisponível"

class PedidoSerializer(serializers.ModelSerializer):
    """
    Serializer para visualizar os detalhes de um pedido existente.
    """
    itens = ItemPedidoSerializer(many=True, read_only=True)
    endereco_entrega = serializers.StringRelatedField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Pedido
        fields = [
            'id', 
            'cliente', 
            'endereco_entrega', 
            'valor_total', 
            'status', 
            'status_display', 
            'metodo_pagamento',
            'data_agendamento',
            'bandeira_cartao',
            'troco_para',
            'criado_em', 
            'codigo_rastreio', 
            'itens'
        ]

class PedidoCreateSerializer(serializers.Serializer):
    """
    Serializer usado especificamente para a criação de um novo pedido.
    """
    endereco_entrega_id = serializers.IntegerField()

    def validate_endereco_entrega_id(self, value):
        request = self.context['request']
        try:
            endereco = Endereco.objects.get(id=value, perfil_cliente__usuario=request.user)
        except Endereco.DoesNotExist:
            raise serializers.ValidationError("Endereço inválido ou não pertence a este usuário.")
        return endereco

    def save(self, **kwargs):
        request = self.context['request']
        cart = self.context['cart']
        endereco = self.validated_data['endereco_entrega_id']
        
        # --- CAPTURA DE DADOS DO REQUEST ---
        metodo_pagamento = request.data.get('metodo_pagamento', 'pix')
        data_agendamento = request.data.get('scheduled_time', None)
        bandeira_cartao = request.data.get('card_brand', '')
        troco_para = request.data.get('change_for', None)
        
        if troco_para == '':
            troco_para = None

        novo_pedido = Pedido.objects.create(
            cliente=request.user.perfilcliente,
            endereco_entrega=endereco,
            valor_total=cart.get_total_price(),
            metodo_pagamento=metodo_pagamento,
            data_agendamento=data_agendamento,
            bandeira_cartao=bandeira_cartao,
            troco_para=troco_para
            # observacao global foi removida
        )
        
        itens_do_pedido = []
        for item in cart:
            itens_do_pedido.append(
                ItemPedido(
                    pedido=novo_pedido,
                    produto=item['product'],
                    preco_unitario=item['price'],
                    quantidade=item['quantity'],
                    observacao=item.get('observation', '') # Salvando a observação do item
                )
            )
        ItemPedido.objects.bulk_create(itens_do_pedido)
        
        cart.clear()
        return novo_pedido