from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from .models import CustomizacaoEmpresa
from .forms import CustomizacaoEmpresaForm
from empresas.models import PerfilEmpresa
from usuarios.permissions import eh_equipe # Aproveitando a sua permissão já existente

@login_required
@user_passes_test(eh_equipe)
def customizacao_view(request):
    """
    View para o lojista alterar o visual (cores, logo, layout) da sua loja.
    """
    # 1. Pega a empresa do utilizador logado
    perfil, _ = PerfilEmpresa.objects.get_or_create(usuario=request.user)
    
    # 2. Pega ou cria a customização atrelada a esta empresa
    customizacao, _ = CustomizacaoEmpresa.objects.get_or_create(empresa=perfil)

    if request.method == 'POST':
        # request.FILES é obrigatório para processar o logo e a capa
        form = CustomizacaoEmpresaForm(request.POST, request.FILES, instance=customizacao)
        if form.is_valid():
            form.save()
            messages.success(request, "Aparência da loja atualizada com sucesso!")
            return redirect('customizacao:painel')
        else:
            messages.error(request, "Erro ao atualizar aparência. Verifique os campos.")
    else:
        form = CustomizacaoEmpresaForm(instance=customizacao)

    return render(request, 'admin/customizacao_loja.html', {'form': form})