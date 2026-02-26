# catalogo/models.py

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _

class Categoria(models.Model):
    """
    Modelo para categorias de produtos. Suporta aninhamento (subcategorias).
    """
    nome = models.CharField(_('nome'), max_length=100)
    slug = models.SlugField(_('slug'), max_length=120, unique=True, help_text=_('Usado para URLs amigáveis. Ex: "camisetas-manga-longa"'))
    
    # Relação de auto-referência para criar subcategorias
    categoria_pai = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='subcategorias',
        verbose_name=_('categoria pai')
    )

    class Meta:
        verbose_name = _('Categoria')
        verbose_name_plural = _('Categorias')
        ordering = ('nome',)

    def __str__(self):
        return self.nome

class Produto(models.Model):
    """
    Modelo principal para os produtos da loja.
    """
    categoria = models.ForeignKey(
        Categoria, 
        related_name='produtos', 
        on_delete=models.CASCADE,
        verbose_name=_('categoria')
    )
    nome = models.CharField(_('nome'), max_length=200)
    slug = models.SlugField(_('slug'), max_length=220, unique=True)
    descricao = models.TextField(_('descrição'), blank=True)
    
    # Essencial usar DecimalField para dinheiro para evitar erros de arredondamento
    preco = models.DecimalField(_('preço'), max_digits=10, decimal_places=2)
    
    estoque = models.PositiveIntegerField(_('estoque'), default=0)
    is_disponivel = models.BooleanField(_('disponível'), default=True)

    criado_em = models.DateTimeField(_('criado em'), auto_now_add=True)
    atualizado_em = models.DateTimeField(_('atualizado em'), auto_now=True)

    class Meta:
        verbose_name = _('Produto')
        verbose_name_plural = _('Produtos')
        ordering = ('-criado_em',) # Mais novos primeiro

    def __str__(self):
        return self.nome

    @property
    def imagem_principal_url(self):
        """
        Retorna a URL da primeira imagem associada ao produto.
        Se não houver imagem, retorna None.
        """
        primeira_imagem = self.imagens.first()
        if primeira_imagem:
            return primeira_imagem.imagem.url
        return None

class ImagemProduto(models.Model):
    """
    Modelo para armazenar múltiplas imagens por produto.
    """
    produto = models.ForeignKey(
        Produto, 
        on_delete=models.CASCADE, 
        related_name='imagens',
        verbose_name=_('produto')
    )
    # Requer a instalação da biblioteca 'Pillow'
    imagem = models.ImageField(_('imagem'), upload_to='produtos/')
    alt_text = models.CharField(
        _('texto alternativo'), 
        max_length=150, 
        blank=True, 
        help_text=_('Descrição da imagem para acessibilidade e SEO')
    )

    class Meta:
        verbose_name = _('Imagem do Produto')
        verbose_name_plural = _('Imagens dos Produtos')

    def __str__(self):
        return f"Imagem de {self.produto.nome}"

class Avaliacao(models.Model):
    """
    Modelo para avaliações (reviews) dos produtos feitas pelos clientes.
    """
    produto = models.ForeignKey(
        Produto, 
        on_delete=models.CASCADE, 
        related_name='avaliacoes',
        verbose_name=_('produto')
    )
    # Ligado diretamente ao Usuário, que é o autor da avaliação
    cliente = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='avaliacoes',
        verbose_name=_('cliente')
    )
    nota = models.IntegerField(_('nota'), validators=[MinValueValidator(1), MaxValueValidator(5)])
    comentario = models.TextField(_('comentário'), blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Avaliação')
        verbose_name_plural = _('Avaliações')
        # Garante que um cliente só pode avaliar um produto uma única vez
        unique_together = ('produto', 'cliente')
        ordering = ('-criado_em',)

    def __str__(self):
        return f"Avaliação de {self.cliente.email} para {self.produto.nome}"