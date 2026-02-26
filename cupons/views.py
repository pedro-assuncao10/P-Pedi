from django.shortcuts import render
from django.urls import reverse_lazy
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.views.generic import ListView, CreateView, UpdateView, DeleteView
from usuarios.permissions import eh_equipe
from .models import Cupom
from .forms import CupomForm

class CupomListView(LoginRequiredMixin, UserPassesTestMixin, ListView):
    model = Cupom
    template_name = 'admin/lista_cupons.html'
    context_object_name = 'cupons'
    ordering = ['-criado_em']

    def test_func(self):
        return eh_equipe(self.request.user)

class CupomCreateView(LoginRequiredMixin, UserPassesTestMixin, CreateView):
    model = Cupom
    form_class = CupomForm
    template_name = 'admin/cadastro_cupom.html'
    success_url = reverse_lazy('cupons:lista_cupons')

    def test_func(self):
        return eh_equipe(self.request.user)

class CupomUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Cupom
    form_class = CupomForm
    template_name = 'admin/cadastro_cupom.html'
    success_url = reverse_lazy('cupons:lista_cupons')

    def test_func(self):
        return eh_equipe(self.request.user)

class CupomDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Cupom
    template_name = 'admin/confirmar_delete_cupom.html' # Vamos usar um template genérico ou criar este
    success_url = reverse_lazy('cupons:lista_cupons')

    def test_func(self):
        return eh_equipe(self.request.user)