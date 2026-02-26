from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import api_views

router = DefaultRouter()
router.register(r'categorias', api_views.CategoriaViewSet)
router.register(r'produtos', api_views.ProdutoViewSet)
router.register(r'imagens-produto', api_views.ImagemProdutoViewSet)

app_name = 'catalogo'

urlpatterns = [
    path('', views.home_view, name='home'),

    # === URL DA TABELA ADMIN ===
    # Definido como 'meus-produtos' conforme solicitado
    path('gestao/meus-produtos/', views.admin_produtos_view, name='admin_produtos'),

    # --- ROTAS DE PRODUTO (CRUD ADMIN) ---
    path('produtos/novo/', views.ProdutoCreateView.as_view(), name='produto_create'),
    path('produtos/<int:pk>/editar/', views.ProdutoUpdateView.as_view(), name='produto_update'),
    path('produtos/<int:pk>/deletar/', views.ProdutoDeleteView.as_view(), name='produto_delete'),
    
    # Rota pública da loja
    path('loja/', views.ProdutoListView.as_view(), name='loja'),
    path('produto/<slug:slug>/', views.ProdutoDetailView.as_view(), name='produto'),

    # --- ROTAS DE CATEGORIA (CRUD ADMIN) ---
    path('categorias/', views.CategoriaListView.as_view(), name='categoria_list'),
    path('categorias/nova/', views.CategoriaCreateView.as_view(), name='categoria_create'),
    path('categorias/<int:pk>/editar/', views.CategoriaUpdateView.as_view(), name='categoria_update'),
    path('categorias/<int:pk>/deletar/', views.CategoriaDeleteView.as_view(), name='categoria_delete'),
    
    # --- Placeholders ---
    path('buscar/', views.dummy_view, name='buscar'),
    path('conta/', views.dummy_view, name='conta'),
    path('carrinho/', views.dummy_view, name='carrinho'),
    path('categorias-todas/', views.CategoriaListView.as_view(), name='categorias'),
    path('sobre/', views.dummy_view, name='sobre'),
    path('receitas/', views.dummy_view, name='receitas'),
    path('blog/', views.dummy_view, name='blog'),
    path('recursos/', views.dummy_view, name='recursos'),
    path('categoria/<slug:slug>/', views.dummy_view, name='categoria'),
    path('carrinho/adicionar/<int:pk>/', views.dummy_view, name='adicionar_carrinho'),
    path('newsletter/', views.dummy_view, name='newsletter_inscrever'),
    path('envio/', views.dummy_view, name='envio'),
    path('devolucoes/', views.dummy_view, name='devolucoes'),
    path('suporte/', views.dummy_view, name='suporte'),
    path('carreiras/', views.dummy_view, name='carreiras'),

    path('api/', include(router.urls)),
]