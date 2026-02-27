from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class PerfilEmpresa(models.Model):
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='perfil_empresa',
        verbose_name=_('usuário dono')
    )
    
    # --- Identificação ---
    razao_social = models.CharField(max_length=255, blank=True)
    nome_fantasia = models.CharField(max_length=255, default="Minha Loja")
    cnpj = models.CharField(max_length=18, blank=True)
    telefone_comercial = models.CharField(max_length=20, blank=True)
    
    # --- Funcionamento ---
    is_aberto = models.BooleanField(
        _('loja aberta agora?'), 
        default=True,
        help_text="Se desmarcado, o site mostrará um aviso de 'Fechado' e bloqueará pedidos."
    )
    horario_funcionamento = models.CharField(
        _('texto do horário'), 
        max_length=255, 
        default="Segunda a Domingo: 18:00 às 23:00",
        help_text="Texto exibido no rodapé ou topo do site."
    )
    
    # --- Localização ---
    endereco_completo = models.TextField(
        _('endereço da loja'), 
        blank=True,
        help_text="Exibido no rodapé e no contato."
    )
    
    # --- Modalidades de Venda ---
    aceita_entrega = models.BooleanField(default=True, verbose_name="Faz Entrega (Delivery)")
    aceita_retirada = models.BooleanField(default=True, verbose_name="Aceita Retirada (Balcão)")
    
    tempo_medio_entrega = models.CharField(max_length=50, default="40-60 min")
    tempo_medio_retirada = models.CharField(max_length=50, default="30-40 min", verbose_name="Tempo Médio de Retirada")
    taxa_entrega_padrao = models.DecimalField(
        max_digits=6, decimal_places=2, default=5.00, 
        verbose_name="Taxa de Entrega Padrão (R$)"
    )

    # --- Pagamentos Aceitos (Para exibir ícones no site) ---
    pagamento_pix = models.BooleanField("Aceita PIX", default=True)
    pagamento_cartao_credito = models.BooleanField("Aceita Crédito", default=True)
    pagamento_cartao_debito = models.BooleanField("Aceita Débito", default=True)
    pagamento_dinheiro = models.BooleanField("Aceita Dinheiro", default=True)
    
    chave_pix_pagamento = models.CharField(
        _('Chave PIX'), 
        max_length=255, 
        blank=True, 
        help_text="Chave PIX para o cliente pagar no checkout."
    )

    class Meta:
        verbose_name = _('Configuração da Loja')
        verbose_name_plural = _('Configurações da Loja')

    def __str__(self):
        return self.nome_fantasia