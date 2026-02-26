from django import forms
from .models import Cupom

class CupomForm(forms.ModelForm):
    class Meta:
        model = Cupom
        fields = ['codigo', 'tipo', 'valor', 'descricao_beneficio', 'inicio', 'fim', 'ativo', 'quantidade_disponivel', 'valor_minimo_pedido']
        widgets = {
            'codigo': forms.TextInput(attrs={'class': 'form-control', 'style': 'text-transform:uppercase'}),
            'tipo': forms.Select(attrs={'class': 'form-control'}),
            'valor': forms.NumberInput(attrs={'class': 'form-control'}),
            'descricao_beneficio': forms.TextInput(attrs={'class': 'form-control'}),
            'inicio': forms.DateTimeInput(attrs={'class': 'form-control', 'type': 'datetime-local'}),
            'fim': forms.DateTimeInput(attrs={'class': 'form-control', 'type': 'datetime-local'}),
            'quantidade_disponivel': forms.NumberInput(attrs={'class': 'form-control'}),
            'valor_minimo_pedido': forms.NumberInput(attrs={'class': 'form-control'}),
            'ativo': forms.CheckboxInput(attrs={'class': 'form-check-input switch'}),
        }

    def clean_codigo(self):
        return self.cleaned_data['codigo'].upper()

    def clean(self):
        cleaned_data = super().clean()
        inicio = cleaned_data.get("inicio")
        fim = cleaned_data.get("fim")

        if inicio and fim and fim < inicio:
            raise forms.ValidationError("A data final deve ser maior que a data inicial.")