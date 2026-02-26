from django import forms
from .models import Categoria, Produto

# --- 1. WIDGET CUSTOMIZADO PARA MULTIPLOS ARQUIVOS ---
class MultipleFileInput(forms.ClearableFileInput):
    allow_multiple_selected = True

class CategoriaForm(forms.ModelForm):
    class Meta:
        model = Categoria
        fields = ['nome', 'slug', 'categoria_pai']
        widgets = {
            'nome': forms.TextInput(attrs={'class': 'form-control'}),
            'slug': forms.TextInput(attrs={'class': 'form-control'}),
            'categoria_pai': forms.Select(attrs={'class': 'form-control'}),
        }

class ProdutoForm(forms.ModelForm):
    # --- 2. USANDO O WIDGET CUSTOMIZADO AQUI ---
    imagens = forms.FileField(
        # Note que não precisamos mais passar 'multiple': True no attrs, 
        # o widget já sabe lidar com isso.
        widget=MultipleFileInput(attrs={'class': 'form-control'}),
        label="Adicionar Imagens",
        required=False,
        help_text="Segure CTRL para selecionar várias imagens"
    )

    class Meta:
        model = Produto
        fields = ['categoria', 'nome', 'slug', 'descricao', 'preco', 'estoque', 'is_disponivel']
        widgets = {
            'categoria': forms.Select(attrs={'class': 'form-control'}),
            'nome': forms.TextInput(attrs={'class': 'form-control'}),
            'slug': forms.TextInput(attrs={'class': 'form-control'}),
            'descricao': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'preco': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
            'estoque': forms.NumberInput(attrs={'class': 'form-control'}),
            'is_disponivel': forms.CheckboxInput(attrs={'class': 'form-check-input', 'style': 'width: 20px; height: 20px;'}),
        }