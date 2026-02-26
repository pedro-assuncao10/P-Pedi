# catalogo/api_views.py
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from .models import Categoria, Produto, ImagemProduto
from .serializers import CategoriaSerializer, ProdutoSerializer, ImagemProdutoSerializer

class CategoriaViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite visualizar e editar categorias.
    """
    queryset = Categoria.objects.all().order_by('nome')
    serializer_class = CategoriaSerializer

class ProdutoViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite visualizar e editar produtos, com suporte a busca.
    """
    queryset = Produto.objects.select_related('categoria').prefetch_related('imagens').filter(is_disponivel=True)
    serializer_class = ProdutoSerializer
    
    # --- 2. Habilitar os filtros ---
    filter_backends = [filters.SearchFilter]
    # --- 3. Definir os campos de busca ---
    search_fields = ['nome', 'descricao'] # Buscará em nome e descrição do produto

class ImagemProdutoViewSet(viewsets.ModelViewSet):
    """
    API endpoint que permite visualizar e deletar imagens de produtos.
    Útil para gerenciar imagens de um produto existente.
    """
    queryset = ImagemProduto.objects.all()
    serializer_class = ImagemProdutoSerializer
