from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db import transaction
from decimal import Decimal

from carrinho.cart import Cart
from pedidos.models import Pedido, ItemPedido
from clientes.models import Endereco
from logistica.models import BairroEntrega # <-- Importa o modelo de bairros

class ProcessarPedidoAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def montandoEndereco(self, request, endereco_obj):
        """ 
        Função auxiliar responsável por formatar e blindar a string de endereço.
        Funciona para qualquer cidade e estado, pegando os dados dinâmicos do banco.
        """
        if not endereco_obj:
            return ""
            
        cidade = getattr(endereco_obj, 'cidade', '')
        estado = getattr(endereco_obj, 'estado', '')
        cep = getattr(endereco_obj, 'cep', '')

        # Monta o endereço base: "Rua, Número"
        endereco_display = f"{endereco_obj.logradouro}, {endereco_obj.numero}"
        
        # Adiciona complemento se existir
        complemento = getattr(endereco_obj, 'complemento', '')
        if complemento:
            endereco_display += f" ({complemento})"
        
        # Adiciona Bairro
        endereco_display += f" - {endereco_obj.bairro}"

        # Adiciona Cidade e Estado APENAS se existirem no banco
        if cidade and estado:
            endereco_display += f", {cidade} - {estado}"
        
        if cep:
            endereco_display += f", {cep}"
            
        return endereco_display

    def post(self, request):
        try:
            print("Iniciando processo de checkout...")
            print(f"dados recebidos: {request.data}")
            user = request.user
            data = request.data
            
            # 1. Inicializa o Carrinho da Sessão
            cart = Cart(request)
            
            if len(cart) == 0:
                return Response({'success': False, 'error': 'Seu carrinho está vazio.'}, status=400)

            # 2. Recupera dados do formulário
            delivery_option = data.get('delivery_option')
            payment_method = data.get('payment_method')

            schedule_option = data.get('schedule_option')
            scheduled_time = data.get('scheduled_time') 

            # --- CAPTURA DE CAMPOS EXTRAS ---
            card_brand = data.get('card_brand', '')
            change_for = data.get('change_for') 
            if change_for == '': change_for = None
            
            # --- NOVA LÓGICA: CAPTURA O BAIRRO E A TAXA ---
            bairro_id = data.get('bairro_id')
            bairro_obj = None
            taxa_entrega = Decimal('0.00')

            data_agendamento_final = None
            if schedule_option == 'schedule' and scheduled_time:
                data_agendamento_final = scheduled_time
            
            # 3. Define o objeto Endereço e Valida a Taxa
            endereco_obj = None
            endereco_display = "Retirada na Loja"
            
            if not hasattr(user, 'perfilcliente'):
                 return Response({'success': False, 'error': 'Perfil de cliente não encontrado.'}, status=400)

            if delivery_option == 'delivery':
                # Validação de Segurança: Obrigatório escolher um bairro
                if not bairro_id:
                    return Response({'success': False, 'error': 'Selecione uma Região de Entrega válida para calcular a taxa.'}, status=400)
                
                try:
                    bairro_obj = BairroEntrega.objects.get(id=bairro_id)
                    taxa_entrega = bairro_obj.taxa
                except BairroEntrega.DoesNotExist:
                    return Response({'success': False, 'error': 'A região de entrega selecionada é inválida.'}, status=400)

                # Busca sempre o ÚLTIMO endereço cadastrado ou editado pelo cliente no Modal
                endereco_obj = user.perfilcliente.enderecos.order_by('-id').first()
                
                if endereco_obj:
                    # Chama a nova função passando o request e o objeto de endereço
                    endereco_display = self.montandoEndereco(request, endereco_obj)
                else:
                    return Response({'success': False, 'error': 'Endereço de entrega não encontrado. Por favor, cadastre um endereço.'}, status=400)
            
            # 4. Criação do Pedido (Transação Atômica)
            with transaction.atomic():
                # O total do pedido agora é: Valor das Pizzas + Taxa de Entrega do Bairro
                total_produtos = cart.get_total_price()
                total_pedido = total_produtos + taxa_entrega
                
                # Cria o pedido (Agora salvando a taxa e o bairro logístico)
                pedido = Pedido.objects.create(
                    cliente=user.perfilcliente,
                    status='AGUARDANDO_PAGAMENTO',
                    metodo_pagamento=payment_method,
                    endereco_entrega=endereco_obj,
                    
                    valor_total=total_pedido,
                    valor_taxa_entrega=taxa_entrega,       # Salva a taxa congelada
                    bairro_logistica=bairro_obj,           # Salva o vínculo para estatísticas
                    
                    data_agendamento=data_agendamento_final,
                    bandeira_cartao=card_brand,
                    troco_para=change_for,
                    codigo_rastreio=''
                )

                # Move itens do carrinho
                itens_resumo = []
                for item in cart:
                    produto = item['product']
                    quantidade = item['quantity']
                    preco = item['price']
                    
                    # Puxa a observação do item salva na sessão do carrinho
                    obs_item = item.get('observation', '')
                    
                    ItemPedido.objects.create(
                        pedido=pedido,
                        produto=produto,
                        quantidade=quantidade,
                        preco_unitario=preco,
                        observacao=obs_item 
                    )
                    
                    # Monta o texto bonitinho pro front-end
                    texto_item = f"{quantidade}x {produto.nome}"
                    if obs_item:
                        texto_item += f" (Obs: {obs_item})"
                    itens_resumo.append(texto_item)

                # Adiciona a taxa visualmente na tela de conclusão
                if delivery_option == 'delivery' and taxa_entrega > 0:
                    itens_resumo.append(f"Taxa de Entrega ({bairro_obj.nome}): R$ {taxa_entrega}")

                cart.clear()

            # 6. Retorna Sucesso
            return Response({
                'success': True,
                'pedido_id': pedido.id,
                'total': total_pedido,
                'metodo_pagamento': 'PIX' if payment_method == 'pix' else payment_method.capitalize(),
                'endereco': endereco_display,
                'itens': itens_resumo
            })

        except Exception as e:
            print(f"Erro no checkout: {str(e)}")
            return Response({'success': False, 'error': str(e)}, status=500)