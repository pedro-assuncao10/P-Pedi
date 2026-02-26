from django import forms
from .models import PerfilEmpresa

class ConfiguracaoLojaForm(forms.ModelForm):
    class Meta:
        model = PerfilEmpresa
        fields = [
            'nome_fantasia', 'telefone_comercial', 'cnpj',
            'is_aberto', 'horario_funcionamento', 'endereco_completo',
            'aceita_entrega', 'aceita_retirada', 'tempo_medio_entrega', 'taxa_entrega_padrao',
            'pagamento_pix', 'pagamento_cartao_credito', 'pagamento_cartao_debito', 'pagamento_dinheiro',
            'chave_pix_pagamento'
        ]
        widgets = {
            'nome_fantasia': forms.TextInput(attrs={'class': 'form-control'}),
            'telefone_comercial': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '(XX) XXXXX-XXXX'}),
            'cnpj': forms.TextInput(attrs={'class': 'form-control'}),
            'horario_funcionamento': forms.TextInput(attrs={'class': 'form-control'}),
            'endereco_completo': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'tempo_medio_entrega': forms.TextInput(attrs={'class': 'form-control'}),
            'taxa_entrega_padrao': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.50'}),
            'chave_pix_pagamento': forms.TextInput(attrs={'class': 'form-control'}),
            # Checkboxes usam classe form-check-input para ficarem bonitos no Bootstrap/Custom CSS
            'is_aberto': forms.CheckboxInput(attrs={'class': 'form-check-input toggle-switch'}),
        }