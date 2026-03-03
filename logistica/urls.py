from django.urls import path
from . import views

app_name = 'logistica'

urlpatterns = [
    # Painel
    path('painel/', views.painel_logistica_view, name='painel'),
    
    # CRUD
    path('adicionar-bairro/', views.adicionar_bairro, name='adicionar_bairro'),
    path('adicionar-motoboy/', views.adicionar_motoboy, name='adicionar_motoboy'),
    path('remover-bairro/<int:bairro_id>/', views.remover_bairro, name='remover_bairro'),
    path('remover-motoboy/<int:motoboy_id>/', views.remover_motoboy, name='remover_motoboy'),
    
    # APIs de Estado
    path('api/toggle-motoboy/<int:motoboy_id>/', views.api_toggle_motoboy, name='api_toggle_motoboy'),
    
    # APIs do KANBAN (Novas)
    path('api/motoboys-ativos/', views.api_listar_motoboys_ativos, name='api_listar_motoboys_ativos'),
    path('api/despachar-pedido/', views.api_despachar_pedido, name='api_despachar_pedido'),
]