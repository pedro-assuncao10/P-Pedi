from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Pedido
from .serializers import PedidoSerializer, PedidoCreateSerializer
from carrinho.cart import Cart
from empresas.models import PerfilEmpresa

class PedidoViewSet(viewsets.ModelViewSet):
    """
    API endpoint para gerenciar pedidos.
    - Listar e recuperar pedidos do usuário autenticado.
    - Criar um novo pedido a partir do carrinho.
    A atualização e exclusão são desabilitadas por padrão para segurança.
    """
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options'] # Permite apenas GET e POST

    def get_queryset(self):
        """
        Esta view deve retornar uma lista de todos os pedidos
        para o usuário atualmente autenticado.
        """
        user = self.request.user
        return Pedido.objects.filter(cliente__usuario=user).prefetch_related('itens', 'itens__produto')

    def get_serializer_class(self):
        """
        Retorna o serializer apropriado dependendo da ação.
        """
        if self.action == 'create':
            return PedidoCreateSerializer
        return PedidoSerializer

    def create(self, request, *args, **kwargs):
        """
        Cria um pedido a partir do carrinho de compras do usuário.
        Verifica se a loja está aberta antes de prosseguir.
        """
        # --- VERIFICAÇÃO DE LOJA ABERTA ---
        # Assume que existe apenas uma empresa configurada ou pega a primeira
        empresa = PerfilEmpresa.objects.first()
        if empresa and not empresa.is_aberto:
            return Response(
                {'erro': 'A loja está fechada no momento. Por favor, tente novamente durante o horário de funcionamento.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # ----------------------------------

        cart = Cart(request)
        if len(cart) == 0:
            return Response({'erro': 'Seu carrinho está vazio.'}, status=status.HTTP_400_BAD_REQUEST)

        # Passamos o request e o cart para o contexto do serializer
        serializer = self.get_serializer(data=request.data, context={'request': request, 'cart': cart})
        serializer.is_valid(raise_exception=True)
        pedido = serializer.save()
        
        # Retorna os dados do pedido recém-criado usando o serializer de visualização
        read_serializer = PedidoSerializer(pedido)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)
