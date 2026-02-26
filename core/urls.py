# ecommerce/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('catalogo.urls', namespace='catalogo')),
    path('pedidos/', include('pedidos.urls', namespace='pedidos')),
    path('carrinho/', include('carrinho.urls', namespace='carrinho')),
    path('conta/', include('usuarios.urls', namespace='usuarios')),
    path('checkout/', include('pagamentos.urls', namespace='pagamentos')),
    path('clientes/', include('clientes.urls', namespace='clientes')),
    path('empresas/', include('empresas.urls', namespace='empresas')),
    path('dashboard/', include('dashboard.urls', namespace='dashboard')),
    path('assinatura-indicacao/', include('assinatura_indicacao.urls', namespace='assinatura_indicacao')),
]

# Configuração para servir arquivos de mídia em desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
