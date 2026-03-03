from django.db import models
from empresas.models import PerfilEmpresa
# Importação em formato de string ('pedidos.Pedido') é feita diretamente nos campos
# para evitar problemas de importação circular entre as apps.

class BairroEntrega(models.Model):
    empresa = models.ForeignKey(PerfilEmpresa, on_delete=models.CASCADE, related_name='bairros_entrega')
    nome = models.CharField(max_length=100, verbose_name="Nome do Bairro/Região")
    taxa = models.DecimalField(max_digits=6, decimal_places=2, default=0.00, verbose_name="Taxa de Entrega (R$)")

    class Meta:
        verbose_name = "Bairro de Entrega"
        verbose_name_plural = "Bairros de Entrega"
        ordering = ['nome']

    def __str__(self):
        return f"{self.nome} - R$ {self.taxa}"

class Motoboy(models.Model):
    empresa = models.ForeignKey(PerfilEmpresa, on_delete=models.CASCADE, related_name='motoboys')
    nome = models.CharField(max_length=100, verbose_name="Nome do Motoboy")
    telefone = models.CharField(max_length=20, blank=True, null=True, verbose_name="WhatsApp")
    placa = models.CharField(max_length=20, blank=True, null=True, verbose_name="Placa da Moto")
    taxa_fixa = models.DecimalField(max_digits=6, decimal_places=2, default=0.00, verbose_name="Taxa Fixa Diária (R$)")
    is_ativo_hoje = models.BooleanField(default=True, verbose_name="Disponível para entregas hoje?")

    class Meta:
        verbose_name = "Motoboy"
        verbose_name_plural = "Motoboys"
        ordering = ['nome']

    def __str__(self):
        return self.nome

# ==========================================
# NOVOS MODELOS: O MOTOR DE ROTEIRIZAÇÃO
# ==========================================

class Rota(models.Model):
    STATUS_CHOICES = [
        ('PREPARANDO', 'Preparando (Aguardando na Loja)'),
        ('EM_ROTA', 'Em Rota de Entrega'),
        ('CONCLUIDA', 'Concluída')
    ]
    empresa = models.ForeignKey(PerfilEmpresa, on_delete=models.CASCADE, related_name='rotas')
    motoboy = models.ForeignKey(Motoboy, on_delete=models.CASCADE, related_name='rotas')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PREPARANDO')
    criado_em = models.DateTimeField(auto_now_add=True)
    finalizado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Rota de Entrega"
        verbose_name_plural = "Rotas de Entrega"

    def __str__(self):
        return f"Rota #{self.id} - {self.motoboy.nome} ({self.get_status_display()})"

class Entrega(models.Model):
    """
    Esta tabela liga 1 Rota a 1 Pedido específico.
    Permite que uma Rota tenha múltiplas Entregas.
    """
    rota = models.ForeignKey(Rota, on_delete=models.CASCADE, related_name='entregas')
    pedido = models.OneToOneField('pedidos.Pedido', on_delete=models.CASCADE, related_name='despacho_logistica')
    
    # Esta taxa será calculada na Fase 3, baseada no bairro do cliente
    taxa_paga_motoboy = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    
    is_concluida = models.BooleanField(default=False)
    entregue_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Entrega (Pacote)"
        verbose_name_plural = "Entregas (Pacotes)"

    def __str__(self):
        return f"Pedido #{self.pedido.id} na Rota #{self.rota.id}"