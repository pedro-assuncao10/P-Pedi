import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class CodigoIndicador(models.Model):
    """
    Gera e armazena o código único de indicação para um usuário.
    Qualquer usuário (Empresa ou Pessoa) pode ter um código.
    """
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='codigo_indicador'
    )
    codigo = models.CharField(max_length=12, unique=True, editable=False, db_index=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.codigo:
            # Gera um código curto e único (ex: 8F3A2C1B)
            self.codigo = str(uuid.uuid4())[:8].upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Cupom: {self.codigo} ({self.usuario.email})"


class Indicacao(models.Model):
    """
    Registra uma indicação bem-sucedida (quando alguém usa o código no cadastro).
    """
    STATUS_CHOICES = [
        ('PENDENTE', 'Aguardando Assinatura'),
        ('APROVADO', 'Assinatura Confirmada (Benefício Liberado)'),
        ('CANCELADO', 'Cancelado/Expirado'),
    ]

    TIPO_BENEFICIO_CHOICES = [
        ('MES_GRATIS', '1 Mês Grátis (Indicador é Empresa)'),
        ('COMISSAO', 'R$ 50,00 (Indicador é Pessoa Física)'),
    ]

    # Quem indicou (Dono do código)
    indicador = models.ForeignKey(
        CodigoIndicador,
        on_delete=models.CASCADE,
        related_name='indicacoes_feitas'
    )
    
    # Quem foi indicado (O novo usuário/empresa que se cadastrou)
    indicado = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='indicacao_recebida',
        verbose_name=_('Usuário Indicado')
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDENTE')
    
    # Armazena qual regra foi aplicada no momento da indicação
    tipo_beneficio = models.CharField(max_length=20, choices=TIPO_BENEFICIO_CHOICES, editable=False)
    
    data_indicacao = models.DateTimeField(auto_now_add=True)
    data_conversao = models.DateTimeField(null=True, blank=True, help_text="Data em que a assinatura foi paga")

    def save(self, *args, **kwargs):
        # Regra de Negócio: Determina o benefício baseado no perfil do indicador
        if not self.pk:
            # Se o usuário indicador tem um perfil_empresa, ele é uma Empresa
            if hasattr(self.indicador.usuario, 'perfil_empresa'):
                self.tipo_beneficio = 'MES_GRATIS'
            else:
                # Caso contrário, assumimos que é Pessoa Física/Parceiro
                self.tipo_beneficio = 'COMISSAO'
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.indicado.email} indicado por {self.indicador.codigo} - {self.get_status_display()}"

# Opcional: Controle de Saldo para Pessoa Física
class CarteiraParceiro(models.Model):
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='carteira_parceiro'
    )
    saldo_disponivel = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    saldo_pendente = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Carteira de {self.usuario.email}: R$ {self.saldo_disponivel}"