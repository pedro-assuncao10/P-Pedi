from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import JsonResponse
from django.contrib import messages
from decimal import Decimal
import json

from .models import BairroEntrega, Motoboy, Rota, Entrega
from .forms import BairroEntregaForm, MotoboyForm
from empresas.models import PerfilEmpresa
from pedidos.models import Pedido
from usuarios.permissions import eh_equipe

@login_required
@user_passes_test(eh_equipe)
def painel_logistica_view(request):
    empresa = PerfilEmpresa.objects.first()
    
    bairros = BairroEntrega.objects.filter(empresa=empresa)
    motoboys = Motoboy.objects.filter(empresa=empresa)

    form_bairro = BairroEntregaForm()
    form_motoboy = MotoboyForm()

    motoboys_ativos = motoboys.filter(is_ativo_hoje=True)
    
    # Atualiza dados vitais da rota na tela
    for m in motoboys_ativos:
        # Pega todas as entregas concluídas deste motoboy hoje
        entregas_hoje = Entrega.objects.filter(rota__motoboy=m, is_concluida=True)
        m.entregas_hoje = entregas_hoje.count()
        m.ganho_entregas = sum([e.taxa_paga_motoboy for e in entregas_hoje]) or Decimal('0.00')
        m.total_receber = m.taxa_fixa + m.ganho_entregas

    context = {
        'bairros': bairros,
        'motoboys': motoboys,
        'motoboys_ativos': motoboys_ativos,
        'form_bairro': form_bairro,
        'form_motoboy': form_motoboy
    }
    return render(request, 'admin/painel_logistica.html', context)

# ... (MANTENHA AQUI AS VIEWS ANTIGAS: adicionar_bairro, adicionar_motoboy, remover, etc) ...
@login_required
@user_passes_test(eh_equipe)
def adicionar_bairro(request):
    empresa = PerfilEmpresa.objects.first()
    if request.method == 'POST':
        form = BairroEntregaForm(request.POST)
        if form.is_valid():
            bairro = form.save(commit=False)
            bairro.empresa = empresa
            bairro.save()
            messages.success(request, "Bairro adicionado com sucesso!")
    return redirect('logistica:painel')

@login_required
@user_passes_test(eh_equipe)
def adicionar_motoboy(request):
    empresa = PerfilEmpresa.objects.first()
    if request.method == 'POST':
        form = MotoboyForm(request.POST)
        if form.is_valid():
            motoboy = form.save(commit=False)
            motoboy.empresa = empresa
            motoboy.save()
            messages.success(request, "Motoboy cadastrado com sucesso!")
    return redirect('logistica:painel')

@login_required
@user_passes_test(eh_equipe)
def remover_bairro(request, bairro_id):
    bairro = get_object_or_404(BairroEntrega, id=bairro_id)
    bairro.delete()
    messages.success(request, "Bairro removido.")
    return redirect('logistica:painel')

@login_required
@user_passes_test(eh_equipe)
def remover_motoboy(request, motoboy_id):
    motoboy = get_object_or_404(Motoboy, id=motoboy_id)
    motoboy.delete()
    messages.success(request, "Motoboy removido.")
    return redirect('logistica:painel')

@login_required
@user_passes_test(eh_equipe)
def api_toggle_motoboy(request, motoboy_id):
    if request.method == 'POST':
        motoboy = get_object_or_404(Motoboy, id=motoboy_id)
        motoboy.is_ativo_hoje = not motoboy.is_ativo_hoje
        motoboy.save()
        return JsonResponse({'success': True, 'is_ativo_hoje': motoboy.is_ativo_hoje})
    return JsonResponse({'success': False}, status=400)


# ==========================================
# NOVAS APIS (INTEGRAÇÃO COM O KANBAN)
# ==========================================

@login_required
@user_passes_test(eh_equipe)
def api_listar_motoboys_ativos(request):
    """ Retorna a lista de motoboys para o Modal do Kanban """
    empresa = PerfilEmpresa.objects.first()
    motoboys = Motoboy.objects.filter(empresa=empresa, is_ativo_hoje=True)
    data = [{'id': m.id, 'nome': m.nome} for m in motoboys]
    return JsonResponse({'success': True, 'motoboys': data})

@login_required
@user_passes_test(eh_equipe)
def api_despachar_pedido(request):
    """ Recebe o Pedido e o Motoboy escolhido e cria a Rota """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            pedido_id = data.get('pedido_id')
            motoboy_id = data.get('motoboy_id')
            
            empresa = PerfilEmpresa.objects.first()
            pedido = get_object_or_404(Pedido, id=pedido_id)
            motoboy = get_object_or_404(Motoboy, id=motoboy_id)
            
            # 1. Verifica se o motoboy já tem uma rota "PREPARANDO" (aberta no balcão).
            # Se não tiver, cria uma Rota nova para ele.
            rota, created = Rota.objects.get_or_create(
                empresa=empresa,
                motoboy=motoboy,
                status='PREPARANDO'
            )
            
            # 2. Associa este pedido à Rota do motoboy
            Entrega.objects.update_or_create(
                rota=rota,
                pedido=pedido,
                defaults={'taxa_paga_motoboy': Decimal('0.00')} # Taxa será configurada na fase de Inteligência
            )
            
            # 3. O pedido passa a estar oficialmente "Pronto para Entrega"
            pedido.status = Pedido.StatusPedido.PRONTO
            pedido.save()
            
            return JsonResponse({
                'success': True, 
                'message': 'Pedido anexado à rota do motoboy com sucesso!',
                'motoboy_nome': motoboy.nome
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
            
    return JsonResponse({'success': False, 'error': 'Método inválido'}, status=405)