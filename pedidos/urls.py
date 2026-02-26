from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import api_views

router = DefaultRouter()
router.register(r'', api_views.PedidoViewSet, basename='pedido-api')

app_name = 'pedidos'

urlpatterns = [
    # --- ENDPOINT DO FRONT ---
    path('', views.HistoricoPedidosView.as_view(), name='historico'),
    path('carrinho/', views.carrinho_detalhe_view, name='carrinho_detalhe'),

    # --- KANBAN ---
    path('painel-admin/', views.painel_kanban_view, name='painel_kanban'),
    path('api/kanban/atualizar/<int:pedido_id>/', views.api_atualizar_status_kanban, name='api_kanban_update'),
    
    # NOVA ROTA: ATUALIZAÇÃO EM LOTE
    path('api/kanban/atualizar-lote/', views.api_atualizar_lote_kanban, name='api_kanban_update_batch'),
    
    path('api/kanban/limpar-prontos/', views.api_limpar_prontos, name='api_limpar_prontos'),

    # --- IMPRESSÃO ---
    path('imprimir/<int:pedido_id>/', views.gerar_pdf_pedido, name='imprimir_pedido'),
    
    path('api/', include(router.urls)),
]