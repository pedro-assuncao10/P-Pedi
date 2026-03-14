from django.urls import path
from django.shortcuts import redirect
from . import views

app_name = 'logistica'

urlpatterns = [
    # Painel Administrativo
    path('painel/', views.painel_logistica_view, name='painel'),
    
    # CRUD
    path('adicionar-bairro/', views.adicionar_bairro, name='adicionar_bairro'),
    path('adicionar-entregador/', views.adicionar_entregador, name='adicionar_motoboy'), # Mantido name antigo para não quebrar o HTML
    path('remover-bairro/<int:bairro_id>/', views.remover_bairro, name='remover_bairro'),
    path('remover-entregador/<int:entregador_id>/', views.remover_entregador, name='remover_motoboy'),
    
    # APIs de Estado
    path('api/toggle-entregador/<int:entregador_id>/', views.api_toggle_entregador, name='api_toggle_motoboy'),
    
    # APIs do KANBAN (Novas)
    path('api/entregadores-ativos/', views.api_listar_entregadores_ativos, name='api_listar_motoboys_ativos'),
    path('api/despachar-pedido/', views.api_despachar_pedido, name='api_despachar_pedido'),

    # 🚀 SOLUÇÃO DO ERRO 404: Redireciona a URL antiga para o novo sistema de Login
    path('motoboy/', lambda request: redirect('logistica:login_entregador'), name='painel_motoboy_legacy'),

    # 📱 ROTAS DO APP DO MOTOBOY/ENTREGADOR (PWA COM LOGIN)
    path('entregador/login/', views.login_entregador, name='login_entregador'),
    path('entregador/logout/', views.logout_entregador, name='logout_entregador'),
    path('entregador/app/', views.painel_entregador_app, name='painel_entregador_app'),
    
    # ⚙️ APIs DE TEMPO REAL DO APP
    path('api/entregador/sync/', views.api_entregador_sync, name='api_entregador_sync'),
    path('api/entregador/action/', views.api_entregador_action, name='api_entregador_action'),
]