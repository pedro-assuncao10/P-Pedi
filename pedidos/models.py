from django.db import models
from django.utils.translation import gettext_lazy as _

class Pedido(models.Model):
    """
    Modelo que representa um pedido (compra) feito por um cliente.
    """
    class StatusPedido(models.TextChoices):
        AGUARDANDO_PAGAMENTO = 'AGUARDANDO_PAGAMENTO', _('Aguardando Pagamento')
        EM_ANDAMENTO = 'EM_ANDAMENTO', _('Em Andamento')
        PRONTO = 'PRONTO', _('Pronto para Entrega')
        ENVIADO = 'ENVIADO', _('Enviado')
        ENTREGUE = 'ENTREGUE', _('Entregue')
        CANCELADO = 'CANCELADO', _('Cancelado')

    class MetodoPagamento(models.TextChoices):
        PIX = 'pix', _('PIX')
        CREDITO = 'credit', _('Cartão de Crédito')
        DINHEIRO = 'money', _('Dinheiro')

    cliente = models.ForeignKey(
        'clientes.PerfilCliente',  
        on_delete=models.SET_NULL,
        null=True,
        related_name='pedidos',
        verbose_name=_('cliente')
    )
    
    endereco_entrega = models.ForeignKey(
        'clientes.Endereco', 
        on_delete=models.SET_NULL,
        null=True,
        related_name='pedidos',
        verbose_name=_('endereço de entrega')
    )

    data_agendamento = models.DateTimeField(
        _('data agendamento'), 
        null=True, 
        blank=True,
        help_text="Data e hora agendada para entrega, se aplicável."
    )
    
    valor_total = models.DecimalField(_('valor total'), max_digits=10, decimal_places=2)

    metodo_pagamento = models.CharField(
        _('método de pagamento'),
        max_length=20,
        choices=MetodoPagamento.choices,
        default=MetodoPagamento.PIX
    )

    troco_para = models.DecimalField(
        _('troco para'),
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Quanto dinheiro o cliente vai entregar (para calcular troco)."
    )

    bandeira_cartao = models.CharField(
        _('bandeira do cartão'),
        max_length=50,
        blank=True,
        help_text="Qual a bandeira do cartão para levar a maquininha correta."
    )
    
    # OBSERVAÇÃO GERAL REMOVIDA DAQUI
    
    status = models.CharField(
        _('status'),
        max_length=50,
        choices=StatusPedido.choices,
        default=StatusPedido.AGUARDANDO_PAGAMENTO
    )

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    codigo_rastreio = models.CharField(_('código de rastreio'), max_length=100, blank=True)

    class Meta:
        verbose_name = _('Pedido')
        verbose_name_plural = _('Pedidos')
        ordering = ('-criado_em',)

    def __str__(self):
        try:
            return f"Pedido #{self.id} - {self.cliente}"
        except (AttributeError, TypeError):
            return f"Pedido #{self.id} - [Cliente Deletado]"


class ItemPedido(models.Model):
    pedido = models.ForeignKey(
        'pedidos.Pedido',
        on_delete=models.CASCADE, 
        related_name='itens',
        verbose_name=_('pedido')
    )
    produto = models.ForeignKey(
        'catalogo.Produto',
        on_delete=models.SET_NULL,
        null=True,
        related_name='itens_pedidos',
        verbose_name=_('produto')
    )
    
    preco_unitario = models.DecimalField(_('preço unitário'), max_digits=10, decimal_places=2)
    quantidade = models.PositiveIntegerField(_('quantidade'))
    
    # --- NOVA OBSERVAÇÃO POR ITEM ---
    observacao = models.TextField(
        _('observação'),
        blank=True,
        null=True,
        help_text="Observação específica para este item (ex: retirar cebola)."
    )

    class Meta:
        verbose_name = _('Item do Pedido')
        verbose_name_plural = _('Itens dos Pedidos')

    def __str__(self):
        produto_nome = self.produto.nome if self.produto else "[Produto Deletado]"
        return f"{self.quantidade}x {produto_nome} no Pedido #{self.pedido.id}"

    def get_custo_total(self):
        return self.preco_unitario * self.quantidade