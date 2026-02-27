from django.contrib import admin
from .models import CustomizacaoEmpresa

@admin.register(CustomizacaoEmpresa)
class CustomizacaoEmpresaAdmin(admin.ModelAdmin):
    list_display = ('empresa', 'direcao_layout', 'cor_principal', 'cor_fundo')
    search_fields = ('empresa__nome_fantasia',)