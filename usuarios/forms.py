# usuarios/forms.py
from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import Usuario
from clientes.models import PerfilCliente

# Mantemos este para a API de edição (modal), se você ainda for usar
class PerfilClienteForm(forms.ModelForm):
    class Meta:
        model = PerfilCliente
        fields = ['nome_completo', 'telefone']

# Este é o do CADASTRO INICIAL
class CadastroUsuarioForm(UserCreationForm):
    # 1. Adicionamos os campos extras que queremos do perfil aqui
    nome_completo = forms.CharField(label='Nome Completo', max_length=255, required=True)
    telefone = forms.CharField(label='Telefone', max_length=20, required=True)
    
    class Meta:
        model = Usuario
        # 2. Definimos a ordem: Email primeiro, depois os campos extras
        fields = ('email', 'nome_completo', 'telefone') 
        labels = {
            'email': 'E-mail',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Estilização
        for field in self.fields.values():
            field.widget.attrs['class'] = 'form-control' # Ou seu estilo CSS

    # 3. Sobrescrevemos o SAVE para salvar nas duas tabelas
    def save(self, commit=True):
        # Salva o Usuário (Email e Senha)
        user = super().save(commit=False)
        user.save()

        # Cria/Salva o Perfil do Cliente com os dados extras
        # Usamos get_or_create para evitar duplicação se algo der errado
        perfil, created = PerfilCliente.objects.get_or_create(usuario=user)
        perfil.nome_completo = self.cleaned_data['nome_completo']
        perfil.telefone = self.cleaned_data['telefone']
        
        if commit:
            perfil.save()
            
        return user