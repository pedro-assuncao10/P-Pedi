from django.urls import path
from . import views

# O namespace 'assinatura_indicacao' vem daqui
app_name = 'assinatura_indicacao'

urlpatterns = [
    # A rota com name='painel_indicacoes'
    path('', views.painel_indicacoes_view, name='painel_indicacoes'),
]