from django.urls import path
from . import views

app_name = 'empresas'

urlpatterns = [
    # Rota para acessar a tela de configuração
    path('admin/configuracoes/', views.configuracao_loja_view, name='configuracao_loja'),
]