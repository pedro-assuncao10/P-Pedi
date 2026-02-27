from django import forms
from .models import CustomizacaoEmpresa

class CustomizacaoEmpresaForm(forms.ModelForm):
    class Meta:
        model = CustomizacaoEmpresa
        fields = ['logo', 'foto_capa', 'cor_principal', 'cor_fundo', 'direcao_layout']
        
        widgets = {
            # O type='color' abre o seletor nativo de cores do navegador
            'cor_principal': forms.TextInput(attrs={'type': 'color', 'class': 'form-control color-picker'}),
            'cor_fundo': forms.TextInput(attrs={'type': 'color', 'class': 'form-control color-picker'}),
            'direcao_layout': forms.Select(attrs={'class': 'form-control'}),
            # Aceitar apenas imagens no upload
            'logo': forms.FileInput(attrs={'class': 'form-control', 'accept': 'image/*'}),
            'foto_capa': forms.FileInput(attrs={'class': 'form-control', 'accept': 'image/*'}),
        }