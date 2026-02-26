from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import AuthenticationForm
from django.contrib import messages
from .forms import CadastroUsuarioForm

def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username') # Lembra que username aqui é o email
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            
            if user is not None:
                login(request, user)
                
                # --- LÓGICA DE DIRECIONAMENTO INTELIGENTE ---
                
                # 1. Se tentou acessar uma URL específica antes de logar (ex: clicou em checkout)
                next_page = request.GET.get('next')
                if next_page:
                    return redirect(next_page)

                # 2. Se for Staff/Admin/Dono -> Painel Admin
                if user.is_staff or user.is_superuser:
                    # Verifica se temos app de pedidos configurado
                    return redirect('pedidos:painel_kanban') 
                
                # 3. Se for Cliente Comum -> Home da Loja
                return redirect('catalogo:home') 
                
            else:
                messages.error(request, "Usuário ou senha inválidos.")
        else:
            messages.error(request, "Dados inválidos.")
    else:
        form = AuthenticationForm()

    return render(request, 'login.html', {'form': form})

def cadastro_view(request):
    if request.method == 'POST':
        form = CadastroUsuarioForm(request.POST)
        if form.is_valid():
            # O form.save() agora cria o Usuario E o PerfilCliente automaticamente
            user = form.save()
            
            # Loga o usuário automaticamente
            login(request, user)
            
            messages.success(request, "Cadastro realizado com sucesso!")
            return redirect('catalogo:home')
        else:
            messages.error(request, "Erro ao cadastrar. Verifique os dados.")
    else:
        form = CadastroUsuarioForm()

    return render(request, 'cadastro_cliente.html', {'form': form})

# Mantenha sua view de logout_view existente aqui também
def logout_view(request):
    logout(request)
    return redirect('catalogo:home')