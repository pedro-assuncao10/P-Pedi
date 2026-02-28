from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.utils import timezone
from django.db.models import Sum
from decimal import Decimal

from .models import ConfiguracaoFinanceira
from empresas.models import PerfilEmpresa
from pedidos.models import Pedido
from usuarios.permissions import eh_equipe

@login_required
@user_passes_test(eh_equipe)
def painel_financeiro_view(request):
    empresa = PerfilEmpresa.objects.first()
    config, created = ConfiguracaoFinanceira.objects.get_or_create(empresa=empresa)

    # 1. PROCESSAR FORMULÁRIO DE ATUALIZAÇÃO (Parte de Cima)
    if request.method == 'POST':
        try:
            config.gasto_pessoal = Decimal(request.POST.get('gasto_pessoal', 0).replace(',', '.'))
            config.gasto_operacional = Decimal(request.POST.get('gasto_operacional', 0).replace(',', '.'))
            config.imposto_pct = Decimal(request.POST.get('imposto_pct', 0).replace(',', '.'))
            config.custo_material_pct = Decimal(request.POST.get('custo_material_pct', 0).replace(',', '.'))
            config.lucro_desejado_pct = Decimal(request.POST.get('lucro_desejado_pct', 0).replace(',', '.'))
            config.save()
            messages.success(request, "Metas financeiras atualizadas!")
            return redirect('financeiro:painel')
        except Exception as e:
            messages.error(request, "Erro ao salvar os dados. Verifique os números.")

    # 2. CALCULAR A META (A Regra de 3 do Sistema)
    custo_fixo_total = config.gasto_pessoal + config.gasto_operacional
    
    # Soma de tudo que "sai" do faturamento em porcentagem
    percentual_saida = (config.imposto_pct + config.custo_material_pct + config.lucro_desejado_pct) / Decimal('100')
    margem_sobra = Decimal('1') - percentual_saida

    meta_faturamento = Decimal('0')
    erro_matematico = False
    
    if margem_sobra > 0:
        # Faturamento Meta = Custo Fixo / (100% - %Saídas)
        meta_faturamento = custo_fixo_total / margem_sobra
    else:
        erro_matematico = True # Se a soma das porcentagens passar de 100%, a conta é impossível

    # 3. BUSCAR A REALIDADE (App Pedidos)
    hoje = timezone.now()
    # Pega pedidos do mês atual que geraram receita (ex: Entregues/Prontos)
    pedidos_mes = Pedido.objects.filter(
        criado_em__year=hoje.year,
        criado_em__month=hoje.month,
        status__in=['ENTREGUE', 'PRONTO'] # Ajuste conforme os seus status reais de sucesso
    )
    
    faturamento_real = pedidos_mes.aggregate(Sum('valor_total'))['valor_total__sum'] or Decimal('0')
    
    # Calcula os gastos reais baseados na % configurada
    imposto_real = faturamento_real * (config.imposto_pct / Decimal('100'))
    material_real = faturamento_real * (config.custo_material_pct / Decimal('100'))
    
    # Lucro Real = O que entrou - O que saiu em % - Os custos fixos que têm de ser pagos de qualquer forma
    lucro_real = faturamento_real - imposto_real - material_real - custo_fixo_total

    # Progresso da Meta
    progresso_meta = 0
    if meta_faturamento > 0:
        progresso_meta = min(int((faturamento_real / meta_faturamento) * 100), 100)

    context = {
        'config': config,
        'meta_faturamento': meta_faturamento,
        'custo_fixo_total': custo_fixo_total,
        'erro_matematico': erro_matematico,
        
        'faturamento_real': faturamento_real,
        'lucro_real': lucro_real,
        'imposto_real': imposto_real,
        'material_real': material_real,
        'progresso_meta': progresso_meta,
        'mes_atual': hoje.strftime('%B / %Y').capitalize()
    }
    
    return render(request, 'admin/painel_financeiro.html', context)