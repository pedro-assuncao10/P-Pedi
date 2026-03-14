from django.db import models
from empresas.models import PerfilEmpresa

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

class Entregador(models.Model):
    empresa = models.ForeignKey(PerfilEmpresa, on_delete=models.CASCADE, related_name='entregadores')
    nome = models.CharField(max_length=100, verbose_name="Nome do Entregador")
    cpf = models.CharField(max_length=14, unique=True, verbose_name="CPF (Login)") # Adicionado CPF único
    telefone = models.CharField(max_length=20, blank=True, null=True, verbose_name="WhatsApp")
    placa = models.CharField(max_length=20, blank=True, null=True, verbose_name="Placa da Moto")
    taxa_fixa = models.DecimalField(max_digits=6, decimal_places=2, default=0.00, verbose_name="Taxa Fixa Diária (R$)")
    is_ativo_hoje = models.BooleanField(default=True, verbose_name="Disponível para entregas hoje?")

    class Meta:
        verbose_name = "Entregador"
        verbose_name_plural = "Entregadores"
        ordering = ['nome']

    def __str__(self):
        return self.nome

class Rota(models.Model):
    STATUS_CHOICES = [
        ('PREPARANDO', 'Preparando (Aguardando na Loja)'),
        ('EM_ROTA', 'Em Rota de Entrega'),
        ('CONCLUIDA', 'Concluída')
    ]
    empresa = models.ForeignKey(PerfilEmpresa, on_delete=models.CASCADE, related_name='rotas')
    entregador = models.ForeignKey(Entregador, on_delete=models.CASCADE, related_name='rotas') # Alterado para Entregador
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PREPARANDO')
    criado_em = models.DateTimeField(auto_now_add=True)
    finalizado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Rota de Entrega"
        verbose_name_plural = "Rotas de Entrega"

    def __str__(self):
        return f"Rota #{self.id} - {self.entregador.nome} ({self.get_status_display()})"

class Entrega(models.Model):
    rota = models.ForeignKey(Rota, on_delete=models.CASCADE, related_name='entregas')
    pedido = models.OneToOneField('pedidos.Pedido', on_delete=models.CASCADE, related_name='despacho_logistica')
    
    taxa_paga_motoboy = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    
    is_concluida = models.BooleanField(default=False)
    entregue_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Entrega (Pacote)"
        verbose_name_plural = "Entregas (Pacotes)"

    def __str__(self):
        return f"Pedido #{self.pedido.id} na Rota #{self.rota.id}"