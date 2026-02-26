from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db import transaction

from carrinho.cart import Cart
from pedidos.models import Pedido, ItemPedido
from clientes.models import Endereco

class ProcessarPedidoAPIView(APIView):
    permission_classes = [IsAuthenticated]

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
            
            # A observação global foi removida da requisição do frontend
            # --------------------------------

            data_agendamento_final = None
            if schedule_option == 'schedule' and scheduled_time:
                data_agendamento_final = scheduled_time
            
            # 3. Define o objeto Endereço
            endereco_obj = None
            endereco_display = "Retirada na Loja"
            
            if not hasattr(user, 'perfilcliente'):
                 return Response({'success': False, 'error': 'Perfil de cliente não encontrado.'}, status=400)

            if delivery_option == 'delivery':
                endereco_obj = user.perfilcliente.enderecos.filter(is_principal=True).first()
                if not endereco_obj:
                    endereco_obj = user.perfilcliente.enderecos.first()
                
                if endereco_obj:
                    endereco_display = f"{endereco_obj.logradouro}, {endereco_obj.numero} - {endereco_obj.bairro}"
                else:
                    return Response({'success': False, 'error': 'Endereço de entrega não encontrado.'}, status=400)
            
            # 4. Criação do Pedido (Transação Atômica)
            with transaction.atomic():
                total_pedido = cart.get_total_price()
                
                # Cria o pedido (Sem observação geral)
                pedido = Pedido.objects.create(
                    cliente=user.perfilcliente,
                    status='AGUARDANDO_PAGAMENTO',
                    metodo_pagamento=payment_method,
                    endereco_entrega=endereco_obj,
                    valor_total=total_pedido,
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
                        observacao=obs_item # Salva a observação específica do item no DB
                    )
                    
                    # Monta o texto bonitinho pro front-end (Step 3: Conclusão)
                    texto_item = f"{quantidade}x {produto.nome}"
                    if obs_item:
                        texto_item += f" (Obs: {obs_item})"
                    itens_resumo.append(texto_item)

                cart.clear()

            # 6. Retorna Sucesso
            return Response({
                'success': True,
                'pedido_id': pedido.id,
                'total': total_pedido,
                'metodo_pagamento': 'PIX' if payment_method == 'pix' else 'Cartão de Crédito',
                'endereco': endereco_display,
                'itens': itens_resumo
            })

        except Exception as e:
            print(f"Erro no checkout: {str(e)}")
            return Response({'success': False, 'error': str(e)}, status=500)