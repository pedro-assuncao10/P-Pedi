from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    # Rota da página HTML
    path('', views.dashboard_view, name='painel_geral'),
    
    # Nova rota da API de dados
    path('api/dados/', views.api_dashboard_data, name='api_dados'),
]