from django.contrib import admin
from .models import Categoria, Produto, ImagemProduto

@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    """
    Configuração da interface de administração para o modelo Categoria.
    """
    list_display = ('nome', 'slug', 'categoria_pai')
    prepopulated_fields = {'slug': ('nome',)}
    search_fields = ('nome',)


class ImagemProdutoInline(admin.TabularInline):
    """
    Permite a edição de imagens diretamente na página de edição do Produto.
    'TabularInline' mostra os campos em formato de tabela, mais compacto.
    """
    model = ImagemProduto
    extra = 1  # Quantos campos de upload de imagem vazios aparecem por padrão.


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    """
    Configuração da interface de administração para o modelo Produto.
    """
    list_display = ('nome', 'categoria', 'preco', 'estoque', 'is_disponivel')
    list_filter = ('is_disponivel', 'categoria')
    list_editable = ('preco', 'estoque', 'is_disponivel')
    prepopulated_fields = {'slug': ('nome',)}
    search_fields = ('nome', 'descricao')
    
    # Adiciona o gerenciador de imagens inline na página do produto
    inlines = [ImagemProdutoInline]
