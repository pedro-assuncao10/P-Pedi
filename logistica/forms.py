from django import forms
from .models import BairroEntrega, Motoboy

class BairroEntregaForm(forms.ModelForm):
    class Meta:
        model = BairroEntrega
        fields = ['nome', 'taxa']
        widgets = {
            'nome': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ex: Centro, Cohama...'}),
            'taxa': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01'}),
        }

class MotoboyForm(forms.ModelForm):
    class Meta:
        model = Motoboy
        fields = ['nome', 'telefone', 'placa', 'taxa_fixa']
        widgets = {
            'nome': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Nome completo'}),
            'telefone': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '(99) 99999-9999'}),
            'placa': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'ABC-1234'}),
            'taxa_fixa': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.50', 'placeholder': 'Diária Ex: 30.00'}),
        }