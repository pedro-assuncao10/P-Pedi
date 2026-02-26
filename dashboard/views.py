from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required, user_passes_test
from django.db.models import Sum, Count
from django.db.models.functions import TruncDay
from django.utils import timezone
from datetime import timedelta

from pedidos.models import Pedido, ItemPedido
from clientes.models import PerfilCliente
from usuarios.permissions import eh_equipe

@login_required
@user_passes_test(eh_equipe)
def dashboard_view(request):
    """
    Renderiza a estrutura da página HTML e os KPIs simples (Cards do topo).
    """
    agora = timezone.now()
    
    # 1. KPIs GERAIS
    faturamento_mes = Pedido.objects.filter(
        criado_em__month=agora.month, 
        criado_em__year=agora.year,
        # status__in=['PAGO', 'ENVIADO', 'ENTREGUE'] # Descomente para filtrar status reais
    ).aggregate(Sum('valor_total'))['valor_total__sum'] or 0

    total_clientes = PerfilCliente.objects.count()
    pedidos_pendentes = Pedido.objects.filter(status='AGUARDANDO_PAGAMENTO').count()

    context = {
        'faturamento_mes': faturamento_mes,
        'total_clientes': total_clientes,
        'pedidos_pendentes': pedidos_pendentes,
    }
    return render(request, 'admin/dashboard.html', context)

@login_required
@user_passes_test(eh_equipe)
def api_dashboard_data(request):
    """
    Retorna os dados complexos dos gráficos em formato JSON.
    """
    agora = timezone.now()
    
    # 2. DADOS DO GRÁFICO DE LINHA (Últimos 7 dias)
    sete_dias_atras = agora - timedelta(days=6)
    vendas_diarias = Pedido.objects.filter(
        criado_em__gte=sete_dias_atras
    ).annotate(dia=TruncDay('criado_em')).values('dia').annotate(total=Count('id')).order_by('dia')

    labels_dias = [v['dia'].strftime('%d/%m') for v in vendas_diarias]
    data_dias = [v['total'] for v in vendas_diarias]

    # 3. DADOS DO GRÁFICO DE PIZZA (Categorias)
    vendas_categoria = ItemPedido.objects.values('produto__categoria__nome').annotate(total=Count('id')).order_by('-total')
    labels_categoria = [item['produto__categoria__nome'] for item in vendas_categoria]
    data_categoria = [item['total'] for item in vendas_categoria]

    # 4. DADOS DO GRÁFICO DE BARRAS (Mês Atual vs Passado)
    mes_atual = agora.month
    ano_atual = agora.year
    
    data_mes_passado = (agora.replace(day=1) - timedelta(days=1))
    mes_passado = data_mes_passado.month
    ano_mes_passado = data_mes_passado.year

    qtd_mes_atual = Pedido.objects.filter(criado_em__month=mes_atual, criado_em__year=ano_atual).count()
    qtd_mes_passado = Pedido.objects.filter(criado_em__month=mes_passado, criado_em__year=ano_mes_passado).count()

    data = {
        'diasLabels': labels_dias,
        'diasData': data_dias,
        'catLabels': labels_categoria,
        'catData': data_categoria,
        'mesAtual': qtd_mes_atual,
        'mesPassado': qtd_mes_passado,
        'mesAtualNome': agora.strftime('%B'),
        'mesPassadoNome': data_mes_passado.strftime('%B')
    }
    
    return JsonResponse(data)