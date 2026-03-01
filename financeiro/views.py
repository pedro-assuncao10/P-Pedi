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

# Função para formatar os resultados finais em texto (Ex: 20.000,00)
def formatar_brl(valor):
    if not valor:
        return "0,00"
    return "{:,.2f}".format(float(valor)).replace(",", "X").replace(".", ",").replace("X", ".")

# Nova função para limpar o que vem do formulário com máscara (Ex: 5.000,00 -> 5000.00)
def limpar_valor_monetario(valor_str):
    if not valor_str:
        return Decimal('0.00')
    valor_limpo = str(valor_str).replace('.', '').replace(',', '.')
    return Decimal(valor_limpo)

@login_required
@user_passes_test(eh_equipe)
def painel_financeiro_view(request):
    empresa = PerfilEmpresa.objects.first()
    config, created = ConfiguracaoFinanceira.objects.get_or_create(empresa=empresa)

    # 1. PROCESSAR FORMULÁRIO (Recebendo os valores limpos das máscaras)
    if request.method == 'POST':
        try:
            config.regime_tributario = request.POST.get('regime_tributario', 'SIMPLES')
            config.gasto_pessoal = limpar_valor_monetario(request.POST.get('gasto_pessoal'))
            config.gasto_operacional = limpar_valor_monetario(request.POST.get('gasto_operacional'))
            config.imposto_pct = limpar_valor_monetario(request.POST.get('imposto_pct'))
            config.custo_material_pct = limpar_valor_monetario(request.POST.get('custo_material_pct'))
            config.lucro_desejado_pct = limpar_valor_monetario(request.POST.get('lucro_desejado_pct'))
            config.save()
            messages.success(request, "Configurações financeiras atualizadas com sucesso!")
            return redirect('financeiro:painel')
        except Exception as e:
            messages.error(request, "Erro ao salvar os dados. Verifique os números.")

    # 2. VARIÁVEIS DE CÁLCULO BÁSICAS
    custo_fixo_total = config.gasto_pessoal + config.gasto_operacional
    imposto_pct = config.imposto_pct / Decimal('100')
    material_pct = config.custo_material_pct / Decimal('100')
    lucro_pct = config.lucro_desejado_pct / Decimal('100')

    meta_faturamento = Decimal('0')
    erro_matematico = False
    
    # 3. O CÁLCULO MÁGICO (Regime Tributário)
    if config.regime_tributario in ['MEI', 'SIMPLES']:
        # Imposto incide sobre o Faturamento Bruto
        percentual_saida = imposto_pct + material_pct + lucro_pct
        margem_sobra = Decimal('1') - percentual_saida
        
        if margem_sobra > 0:
            meta_faturamento = custo_fixo_total / margem_sobra
        else:
            erro_matematico = True 
            
    else:
        # PRESUMIDO / REAL: Imposto incide sobre o Lucro Bruto
        if imposto_pct >= 1:
            erro_matematico = True
        else:
            # Lucro bruto necessário antes de pagar os impostos sobre ele
            lucro_bruto_necessario_pct = lucro_pct / (Decimal('1') - imposto_pct)
            percentual_saida = material_pct + lucro_bruto_necessario_pct
            margem_sobra = Decimal('1') - percentual_saida
            
            if margem_sobra > 0:
                meta_faturamento = custo_fixo_total / margem_sobra
            else:
                erro_matematico = True

    # 4. BUSCAR A REALIDADE (App Pedidos)
    hoje = timezone.now()
    pedidos_mes = Pedido.objects.filter(
        criado_em__year=hoje.year,
        criado_em__month=hoje.month,
        status__in=['ENTREGUE', 'PRONTO']
    )
    
    faturamento_real = pedidos_mes.aggregate(Sum('valor_total'))['valor_total__sum'] or Decimal('0')
    material_real = faturamento_real * material_pct

    # Cálculo dos gastos e lucro real dependendo do regime
    if config.regime_tributario in ['MEI', 'SIMPLES']:
        imposto_real = faturamento_real * imposto_pct
        lucro_real = faturamento_real - imposto_real - material_real - custo_fixo_total
    else:
        lucro_bruto_real = faturamento_real - material_real - custo_fixo_total
        if lucro_bruto_real > 0:
            imposto_real = lucro_bruto_real * imposto_pct
        else:
            imposto_real = Decimal('0')
        lucro_real = lucro_bruto_real - imposto_real

    # Progresso da barra
    progresso_meta = 0
    if meta_faturamento > 0:
        progresso_meta = min(int((faturamento_real / meta_faturamento) * 100), 100)

    context = {
        'config': config,
        'erro_matematico': erro_matematico,
        'progresso_meta': progresso_meta,
        'mes_atual': hoje.strftime('%B / %Y').capitalize(),
        
        # Strings para carregar nas caixas de input (Ex: 5.000,00 em vez de 5000.00)
        'gasto_pessoal_input': formatar_brl(config.gasto_pessoal),
        'gasto_operacional_input': formatar_brl(config.gasto_operacional),
        'imposto_pct_input': formatar_brl(config.imposto_pct).replace('.', ''), # Sem ponto de milhar em %
        'custo_material_pct_input': formatar_brl(config.custo_material_pct).replace('.', ''),
        'lucro_desejado_pct_input': formatar_brl(config.lucro_desejado_pct).replace('.', ''),
        
        # Resultados Finais Formatados (R$ X.XXX,XX)
        'meta_faturamento_str': formatar_brl(meta_faturamento),
        'custo_fixo_total_str': formatar_brl(custo_fixo_total),
        'faturamento_real_str': formatar_brl(faturamento_real),
        'lucro_real_str': formatar_brl(lucro_real),
        'imposto_real_str': formatar_brl(imposto_real),
        'material_real_str': formatar_brl(material_real),
        
        'lucro_real_raw': lucro_real, 
    }
    
    return render(request, 'admin/painel_financeiro.html', context)