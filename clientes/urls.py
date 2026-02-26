from django.urls import path
from . import api_views

app_name = 'clientes'

urlpatterns = [
    path('api/salvar-dados-completos/', api_views.SalvarDadosCompletosAPIView.as_view(), name='api_salvar_dados_completos'),
]