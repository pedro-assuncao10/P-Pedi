from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

class Cupom(models.Model):
    TIPO_CHOICES = [
        ('PORCENTAGEM', 'Porcentagem (%)'),
        ('VALOR', 'Valor Fixo (R$)'),
        ('BRINDE', 'Brinde / Benefício Especial'),
    ]

    codigo = models.CharField(max_length=50, unique=True, help_text="O código que o cliente vai digitar. Ex: NATAL10")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='PORCENTAGEM')
    
    # Para descontos numéricos
    valor = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Valor do desconto em R$ ou porcentagem (0 a 100)."
    )
    
    # Para regras complexas (Ex: Compre 2 leve 3)
    descricao_beneficio = models.CharField(
        max_length=255, blank=True, null=True,
        help_text="Descrição se for um brinde. Ex: 'Ganhe um refri na compra de 2 pizzas'"
    )

    # Regras de Validade
    inicio = models.DateTimeField(default=timezone.now)
    fim = models.DateTimeField()
    ativo = models.BooleanField(default=True)
    
    quantidade_disponivel = models.PositiveIntegerField(
        null=True, blank=True, 
        help_text="Quantas vezes esse cupom pode ser usado no total? Deixe vazio para ilimitado."
    )
    valor_minimo_pedido = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00,
        help_text="Valor mínimo do carrinho para aplicar o cupom."
    )

    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.codigo

    @property
    def is_valido(self):
        agora = timezone.now()
        return self.ativo and self.inicio <= agora <= self.fim