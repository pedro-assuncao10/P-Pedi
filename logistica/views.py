from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import JsonResponse
from django.contrib import messages
from decimal import Decimal
import json

from .models import BairroEntrega, Entregador, Rota, Entrega
from .forms import BairroEntregaForm, EntregadorForm
from empresas.models import PerfilEmpresa
from pedidos.models import Pedido
from usuarios.permissions import eh_equipe

from django.utils import timezone
from django.db.models import Sum
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import re

@login_required
@user_passes_test(eh_equipe)
def painel_logistica_view(request):
    empresa = PerfilEmpresa.objects.first()
    
    bairros = BairroEntrega.objects.filter(empresa=empresa)
    entregadores = Entregador.objects.filter(empresa=empresa)

    form_bairro = BairroEntregaForm()
    form_entregador = EntregadorForm()

    entregadores_ativos = entregadores.filter(is_ativo_hoje=True)
    
    # Atualiza dados vitais da rota na tela
    for m in entregadores_ativos:
        entregas_hoje = Entrega.objects.filter(rota__entregador=m, is_concluida=True)
        m.entregas_hoje = entregas_hoje.count()
        m.ganho_entregas = sum([e.taxa_paga_motoboy for e in entregas_hoje]) or Decimal('0.00')
        m.total_receber = m.taxa_fixa + m.ganho_entregas

    context = {
        'bairros': bairros,
        'entregadores': entregadores,
        'entregadores_ativos': entregadores_ativos,
        'form_bairro': form_bairro,
        'form_entregador': form_entregador
    }
    return render(request, 'admin/painel_logistica.html', context)


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
def adicionar_entregador(request):
    empresa = PerfilEmpresa.objects.first()
    if request.method == 'POST':
        form = EntregadorForm(request.POST)
        if form.is_valid():
            entregador = form.save(commit=False)
            entregador.empresa = empresa
            
            # Limpa o CPF (remove pontuação) para guardar no BD de forma standard
            cpf_limpo = re.sub(r'\D', '', entregador.cpf)
            entregador.cpf = cpf_limpo
            
            entregador.save()
            messages.success(request, "Entregador cadastrado com sucesso!")
        else:
            # Caso o CPF já exista ou haja outro erro de validação
            for field, errors in form.errors.items():
                for error in errors:
                    messages.error(request, f"{field.capitalize()}: {error}")
                    
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
def remover_entregador(request, entregador_id):
    entregador = get_object_or_404(Entregador, id=entregador_id)
    entregador.delete()
    messages.success(request, "Entregador removido.")
    return redirect('logistica:painel')

@login_required
@user_passes_test(eh_equipe)
def api_toggle_entregador(request, entregador_id):
    if request.method == 'POST':
        entregador = get_object_or_404(Entregador, id=entregador_id)
        entregador.is_ativo_hoje = not entregador.is_ativo_hoje
        entregador.save()
        return JsonResponse({'success': True, 'is_ativo_hoje': entregador.is_ativo_hoje})
    return JsonResponse({'success': False}, status=400)


# ==========================================
# NOVAS APIS (INTEGRAÇÃO COM O KANBAN)
# ==========================================

@login_required
@user_passes_test(eh_equipe)
def api_listar_entregadores_ativos(request):
    """ Retorna a lista de entregadores para o Modal do Kanban """
    empresa = PerfilEmpresa.objects.first()
    entregadores = Entregador.objects.filter(empresa=empresa, is_ativo_hoje=True)
    data = [{'id': m.id, 'nome': m.nome} for m in entregadores]
    return JsonResponse({'success': True, 'motoboys': data})

@login_required
@user_passes_test(eh_equipe)
def api_despachar_pedido(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            pedido_id = data.get('pedido_id')
            entregador_id = data.get('motoboy_id') # Mantido o nome do key json caso o front já use isso
            
            empresa = PerfilEmpresa.objects.first()
            pedido = get_object_or_404(Pedido, id=pedido_id)
            entregador = get_object_or_404(Entregador, id=entregador_id)
            
            rota, created = Rota.objects.get_or_create(
                empresa=empresa,
                entregador=entregador,
                status='PREPARANDO'
            )
            
            Entrega.objects.update_or_create(
                rota=rota,
                pedido=pedido,
                defaults={'taxa_paga_motoboy': Decimal('0.00')}
            )
            
            pedido.status = Pedido.StatusPedido.PRONTO
            pedido.save()
            
            return JsonResponse({
                'success': True, 
                'message': 'Pedido anexado à rota com sucesso!',
                'motoboy_nome': entregador.nome
            })
            
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
            
    return JsonResponse({'success': False, 'error': 'Método inválido'}, status=405)


# ==========================================
# 📱 VIEWS DA APLICAÇÃO WEB DO MOTOBOY (PWA)
# ==========================================

def login_entregador(request):
    """ Tela inicial do PWA para login via CPF """
    if request.method == 'POST':
        cpf_digitado = request.POST.get('cpf', '')
        # Limpa o CPF para comparar (remove traços e pontos)
        cpf_limpo = re.sub(r'\D', '', cpf_digitado)
        
        try:
            entregador = Entregador.objects.get(cpf=cpf_limpo)
            # Login com sucesso! Guarda na sessão
            request.session['entregador_id'] = entregador.id
            return redirect('logistica:painel_entregador_app')
        except Entregador.DoesNotExist:
            messages.error(request, "CPF não encontrado. Solicite o seu registo ao lojista.")
            
    # Se já estiver autenticado na sessão, salta o login
    if 'entregador_id' in request.session:
        return redirect('logistica:painel_entregador_app')
        
    return render(request, 'login_entregador.html')

def logout_entregador(request):
    """ Limpa a sessão do entregador """
    if 'entregador_id' in request.session:
        del request.session['entregador_id']
    return redirect('logistica:login_entregador')

def painel_entregador_app(request):
    """ Renderiza a casca principal da App do Motoboy baseado na sessão """
    entregador_id = request.session.get('entregador_id')
    
    if not entregador_id:
        return redirect('logistica:login_entregador')
        
    entregador = get_object_or_404(Entregador, id=entregador_id)
    mapbox_token = getattr(settings, 'MAPBOX_TOKEN', '')
    
    context = {
        'motoboy': entregador,
        'mapbox_token': mapbox_token
    }
    return render(request, 'painel_motoboy.html', context)


def api_entregador_sync(request):
    """ 
    API chamada a cada 3 segundos pelo telemóvel do Motoboy.
    Agora lê o ID da sessão!
    """
    entregador_id = request.session.get('entregador_id')
    
    # Se a sessão expirar, envia código para forçar refresh e ir para o login
    if not entregador_id:
        return JsonResponse({'auth_error': True}, status=401)
        
    entregador = get_object_or_404(Entregador, id=entregador_id)
    
    hoje = timezone.now().date()
    entregas_hoje = Entrega.objects.filter(
        rota__entregador=entregador, 
        is_concluida=True, 
        entregue_em__date=hoje
    )
    ganho_entregas = entregas_hoje.aggregate(Sum('taxa_paga_motoboy'))['taxa_paga_motoboy__sum'] or Decimal('0.00')
    total_ganhos = entregador.taxa_fixa + ganho_entregas

    rota_ativa = Rota.objects.filter(entregador=entregador).exclude(status='CONCLUIDA').first()
    
    dados = {
        'ganhos_hoje': float(total_ganhos),
        'status_tela': 'IDLE',
        'entrega': None
    }

    if rota_ativa:
        entrega = rota_ativa.entregas.first()
        if entrega:
            pedido = entrega.pedido
            endereco = pedido.endereco_entrega
            
            endereco_str = "Endereço não informado"
            lat = ""
            lng = ""
            
            if endereco:
                cidade = getattr(endereco, 'cidade', '')
                estado = getattr(endereco, 'estado', '')
                cep = getattr(endereco, 'cep', '')
                
                # Monta o Endereço Completo e Blindado para o Fallback
                endereco_str = f"{endereco.logradouro}, {endereco.numero}"
                complemento = getattr(endereco, 'complemento', '')
                if complemento:
                    endereco_str += f" ({complemento})"
                    
                if endereco.bairro:
                    endereco_str += f" - {endereco.bairro}"
                    
                if cidade and estado:
                    endereco_str += f", {cidade} - {estado}"
                    
                if cep:
                    endereco_str += f", {cep}"
                
                # Prepara as coordenadas extraindo direto do banco de dados (Forçando conversão de vírgula se houver)
                lat = str(getattr(endereco, 'latitude', '') or '').replace(',', '.')
                lng = str(getattr(endereco, 'longitude', '') or '').replace(',', '.')
            
            cliente_nome = getattr(pedido.cliente, 'nome_completo', 'Cliente') if pedido.cliente else 'Cliente'
            cliente_tel = getattr(pedido.cliente, 'telefone', '') if pedido.cliente else ''
            
            taxa = entrega.taxa_paga_motoboy
            if taxa == 0 and pedido.valor_taxa_entrega:
                taxa = pedido.valor_taxa_entrega

            dados['status_tela'] = 'RINGING' if rota_ativa.status == 'PREPARANDO' else 'ACCEPTED'
            
            dados['entrega'] = {
                'rota_id': rota_ativa.id,
                'pedido_id': pedido.id,
                'taxa': float(taxa),
                'endereco_formatado': endereco_str,
                'cliente_nome': cliente_nome,
                'cliente_telefone': cliente_tel,
                'pagamento': f"{pedido.get_metodo_pagamento_display() if hasattr(pedido, 'get_metodo_pagamento_display') else pedido.metodo_pagamento} - R$ {pedido.valor_total}",
                'latitude': lat,
                'longitude': lng
            }

    return JsonResponse(dados)

@csrf_exempt
def api_entregador_action(request):
    """ API que recebe os cliques dos botões do Motoboy """
    # Verifica a sessão antes de permitir a acção
    if 'entregador_id' not in request.session:
         return JsonResponse({'success': False, 'error': 'Não autenticado'}, status=401)
         
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            action = data.get('action')
            rota_id = data.get('rota_id')
            
            # Garantir que a rota pertence ao entregador logado
            entregador_id = request.session['entregador_id']
            rota = get_object_or_404(Rota, id=rota_id, entregador_id=entregador_id)
            
            if action == 'ACCEPT':
                rota.status = 'EM_ROTA'
                rota.save()
                
            elif action == 'REJECT':
                rota.entregas.all().delete()
                rota.delete()
                
            elif action == 'FINISH':
                rota.status = 'CONCLUIDA'
                rota.finalizado_em = timezone.now()
                rota.save()
                
                entrega = rota.entregas.first()
                if entrega:
                    entrega.is_concluida = True
                    entrega.entregue_em = timezone.now()
                    if entrega.taxa_paga_motoboy == 0 and entrega.pedido.valor_taxa_entrega:
                        entrega.taxa_paga_motoboy = entrega.pedido.valor_taxa_entrega
                    entrega.save()
                    
                    pedido = entrega.pedido
                    pedido.status = 'ENTREGUE' 
                    pedido.save()
            
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
            
    return JsonResponse({'success': False, 'error': 'Method Not Allowed'}, status=405)