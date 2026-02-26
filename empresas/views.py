from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from .models import PerfilEmpresa
from .forms import ConfiguracaoLojaForm
from usuarios.permissions import eh_equipe

@login_required
@user_passes_test(eh_equipe)
def configuracao_loja_view(request):
    """
    View para o dono editar as configurações gerais da loja.
    """
    # Pega o perfil da empresa do usuário logado ou cria se não existir
    perfil, created = PerfilEmpresa.objects.get_or_create(usuario=request.user)
    
    if request.method == 'POST':
        form = ConfiguracaoLojaForm(request.POST, instance=perfil)
        if form.is_valid():
            form.save()
            messages.success(request, "Configurações da loja atualizadas com sucesso!")
            return redirect('empresas:configuracao_loja')
        else:
            messages.error(request, "Erro ao salvar configurações. Verifique os campos.")
    else:
        form = ConfiguracaoLojaForm(instance=perfil)
    
    return render(request, 'admin/configuracao_loja.html', {'form': form})