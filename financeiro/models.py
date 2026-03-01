from django.db import models
from empresas.models import PerfilEmpresa

class ConfiguracaoFinanceira(models.Model):
    REGIME_CHOICES = [
        ('MEI', 'MEI (Microempreendedor)'),
        ('SIMPLES', 'Simples Nacional'),
        ('PRESUMIDO', 'Lucro Presumido'),
        ('REAL', 'Lucro Real'),
    ]

    empresa = models.OneToOneField(PerfilEmpresa, on_delete=models.CASCADE, related_name='financeiro')
    
    # --- NOVO: Regime Tributário ---
    regime_tributario = models.CharField(max_length=20, choices=REGIME_CHOICES, default='SIMPLES', verbose_name="Regime Tributário")
    
    # === CUSTOS FIXOS (Em R$) ===
    gasto_pessoal = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="Folha de Pagamento (R$)")
    gasto_operacional = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="Custos Operacionais (Água, Luz, Net, Aluguel)")
    
    # === CUSTOS VARIÁVEIS E METAS (Em %) ===
    imposto_pct = models.DecimalField(max_digits=5, decimal_places=2, default=6.00, verbose_name="Imposto (%)")
    custo_material_pct = models.DecimalField(max_digits=5, decimal_places=2, default=30.00, verbose_name="Custo de Material/Insumos (%)")
    lucro_desejado_pct = models.DecimalField(max_digits=5, decimal_places=2, default=30.00, verbose_name="Lucro Desejado (%)")

    def __str__(self):
        return f"Financeiro: {self.empresa.nome_fantasia}"