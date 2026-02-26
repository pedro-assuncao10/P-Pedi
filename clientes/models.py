# clientes/models.py

from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class PerfilCliente(models.Model):
    """
    Modelo que estende o Usuário padrão com informações específicas do cliente.
    """
    # Relação 1-para-1 com o modelo de Usuário. Se o Usuário for deletado,
    # o perfil também será. Usar o e-mail do usuário como chave primária
    # é uma otimização que evita uma coluna extra de 'id' nesta tabela.
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        verbose_name=_('usuário')
    )

    nome_completo = models.CharField(_('nome completo'), max_length=255)
    cpf = models.CharField(_('CPF'), max_length=14, unique=True, null=True, blank=True)
    telefone = models.CharField(_('telefone'), max_length=20, null=True, blank=True)
    data_nascimento = models.DateField(_('data de nascimento'), null=True, blank=True)

    criado_em = models.DateTimeField(_('criado em'), auto_now_add=True)
    atualizado_em = models.DateTimeField(_('atualizado em'), auto_now=True)
    
    class Meta:
        verbose_name = _('Perfil de Cliente')
        verbose_name_plural = _('Perfis de Clientes')

    def __str__(self):
        return self.nome_completo or str(self.usuario.email)


class Endereco(models.Model):
    """
    Modelo para armazenar os endereços dos clientes.
    Um cliente pode ter múltiplos endereços.
    """
    perfil_cliente = models.ForeignKey(
        PerfilCliente,
        on_delete=models.CASCADE,
        related_name='enderecos', # Permite o acesso inverso: meu_perfil.enderecos.all()
        verbose_name=_('perfil do cliente')
    )
    
    logradouro = models.CharField(_('logradouro'), max_length=255)
    numero = models.CharField(_('número'), max_length=20)
    complemento = models.CharField(_('complemento'), max_length=100, blank=True)
    bairro = models.CharField(_('bairro'), max_length=100)
    cidade = models.CharField(_('cidade'), max_length=100)
    estado = models.CharField(_('estado'), max_length=2)  # Sigla do estado (UF)
    cep = models.CharField(_('CEP'), max_length=9)
    is_principal = models.BooleanField(_('endereço principal'), default=False)

    class Meta:
        verbose_name = _('Endereço')
        verbose_name_plural = _('Endereços')
        # Garante que um cliente não tenha dois endereços com o mesmo CEP e número
        unique_together = ('perfil_cliente', 'cep', 'numero')

    def __str__(self):
        return f"{self.logradouro}, {self.numero} - {self.cidade}/{self.estado}"