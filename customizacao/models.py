from django.db import models
from empresas.models import PerfilEmpresa

class CustomizacaoEmpresa(models.Model):
    # Relacionamento 1-para-1 com a Empresa
    empresa = models.OneToOneField(
        PerfilEmpresa,
        on_delete=models.CASCADE,
        related_name='customizacao',
        verbose_name="Empresa"
    )

    # --- Identidade Visual ---
    logo = models.ImageField(
        upload_to='logos/', 
        blank=True, 
        null=True, 
        verbose_name="Logo da Loja"
    )
    foto_capa = models.ImageField(
        upload_to='capas/', 
        blank=True, 
        null=True, 
        verbose_name="Foto de Capa"
    )

    # --- Cores (Armazenaremos o HEX da cor, ex: #E91E63) ---
    cor_principal = models.CharField(
        max_length=7, 
        default="#E91E63", 
        verbose_name="Cor Principal (Botões e Detalhes)"
    )
    cor_fundo = models.CharField(
        max_length=7, 
        default="#FFFFFF", 
        verbose_name="Cor de Fundo (Tema Clean/Dark)"
    )

    # --- Layout ---
    DIRECAO_CHOICES = [
        ('vertical', 'Vertical (Rolagem padrão para baixo)'),
        ('horizontal', 'Horizontal (Rolagem lateral por categoria)'),
    ]
    direcao_layout = models.CharField(
        max_length=15,
        choices=DIRECAO_CHOICES,
        default='vertical',
        verbose_name="Direção do Layout"
    )

    class Meta:
        verbose_name = "Customização da Empresa"
        verbose_name_plural = "Customizações das Empresas"

    def __str__(self):
        return f"Aparência: {self.empresa.nome_fantasia}"