from django.urls import path
from . import views, api_views

app_name = 'pagamentos'

urlpatterns = [
    # A rota principal do app (/checkout/) levará para a página de checkout
    path('', views.CheckoutView.as_view(), name='checkout'),
    path('api/processar-pedido/', api_views.ProcessarPedidoAPIView.as_view(), name='api_processar_pedido'),
]