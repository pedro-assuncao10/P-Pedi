from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from django.urls import reverse_lazy
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.decorators import login_required, user_passes_test

from .models import Categoria, Produto, ImagemProduto
from .forms import CategoriaForm, ProdutoForm
from usuarios.permissions import eh_equipe
from empresas.models import PerfilEmpresa
from customizacao.models import CustomizacaoEmpresa

def home_view(request):
    """
    Renderiza a página inicial do e-commerce.
    """
    produtos_recentes = Produto.objects.filter(is_disponivel=True).order_by('-criado_em')[:8]
    categorias_populares = Categoria.objects.all()[:10] 

    empresa = PerfilEmpresa.objects.first()
    loja_aberta = empresa.is_aberto if empresa else True

    # --- NOVA LÓGICA: Busca a customização visual vinculada à empresa ---
    customizacao = None
    if empresa and hasattr(empresa, 'customizacao'):
        customizacao = empresa.customizacao

    context = {
        'produtos': produtos_recentes,
        'categorias': categorias_populares,
        'loja_aberta': loja_aberta, # Passa para o template
        'empresa': empresa, # Enviando para o template
        'customizacao': customizacao, # Enviando para o template
    }
    return render(request, 'home.html', context)

# --- VIEW EXCLUSIVA DO ADMIN (Listagem da Tabela) ---

@login_required
@user_passes_test(eh_equipe)
def admin_produtos_view(request):
    """
    Lista todos os produtos para o administrador.
    """
    produtos = Produto.objects.all().order_by('-id') 
    context = {
        'produtos': produtos
    }
    # CORREÇÃO: Aponta para o template correto criado em templates/admin/
    return render(request, 'admin/lista_produtos.html', context)


# --- Views para Categoria ---

class CategoriaListView(ListView):
    model = Categoria
    template_name = 'catalogo/categoria_list.html'
    context_object_name = 'categorias'

class CategoriaCreateView(CreateView):
    model = Categoria
    form_class = CategoriaForm
    # Usa o template administrativo
    template_name = 'admin/cadastro_categoria.html' 
    # Redireciona para a lista de produtos do admin após criar
    success_url = reverse_lazy('catalogo:admin_produtos')

class CategoriaUpdateView(UpdateView):
    model = Categoria
    form_class = CategoriaForm
    # Usa o template administrativo
    template_name = 'admin/cadastro_categoria.html'
    success_url = reverse_lazy('catalogo:admin_produtos')

class CategoriaDeleteView(DeleteView):
    model = Categoria
    template_name = 'catalogo/categoria_confirm_delete.html'
    success_url = reverse_lazy('catalogo:admin_produtos')


# --- VIEWS PÚBLICAS DE PRODUTO (CLIENTE) ---

class ProdutoListView(ListView):
    model = Produto
    template_name = 'catalogo/produto_list.html'
    context_object_name = 'produtos'
    
    def get_queryset(self):
        return Produto.objects.filter(is_disponivel=True)

class ProdutoDetailView(DetailView):
    model = Produto
    template_name = 'catalogo/produto_detail.html'
    context_object_name = 'produto'


# --- VIEWS CRUD DE PRODUTO (ADMINISTRATIVAS/PROTEGIDAS) ---

class ProdutoCreateView(LoginRequiredMixin, UserPassesTestMixin, CreateView):
    model = Produto
    form_class = ProdutoForm
    # Usa o template administrativo
    template_name = 'admin/cadastro_produto.html'
    success_url = reverse_lazy('catalogo:admin_produtos') 

    def test_func(self):
        return eh_equipe(self.request.user)

    def form_valid(self, form):
        self.object = form.save()
        images = self.request.FILES.getlist('imagens')
        for image in images:
            ImagemProduto.objects.create(produto=self.object, imagem=image)
        return super().form_valid(form)

class ProdutoUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Produto
    form_class = ProdutoForm
    # Usa o template administrativo
    template_name = 'admin/cadastro_produto.html'
    success_url = reverse_lazy('catalogo:admin_produtos')

    def test_func(self):
        return eh_equipe(self.request.user)

    def form_valid(self, form):
        self.object = form.save()
        images = self.request.FILES.getlist('imagens')
        for image in images:
            ImagemProduto.objects.create(produto=self.object, imagem=image)
        return super().form_valid(form)

class ProdutoDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Produto
    # Mantém o template de confirmação (pode ser movido para admin/ se desejar)
    template_name = 'catalogo/produto_confirm_delete.html'
    success_url = reverse_lazy('catalogo:admin_produtos')

    def test_func(self):
        return eh_equipe(self.request.user)


# --- DUMMY VIEW ---

def dummy_view(request, *args, **kwargs):
    page_name = request.resolver_match.url_name
    return HttpResponse(f"<h1>Página '{page_name}' em construção</h1><p>Path: {request.path}</p>")