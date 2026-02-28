from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.template.loader import get_template
from django.utils import timezone
from django.views.generic import ListView
from django.contrib.auth.mixins import LoginRequiredMixin
import json
from xhtml2pdf import pisa 

from .models import Pedido
from carrinho.cart import Cart
from usuarios.permissions import eh_equipe
from empresas.models import PerfilEmpresa # <-- IMPORTANTE: Importamos o modelo da Empresa

@login_required
def carrinho_detalhe_view(request):
    cart = Cart(request)
    
    # --- LÓGICA DE CUSTOMIZAÇÃO ---
    empresa = PerfilEmpresa.objects.first()
    customizacao = getattr(empresa, 'customizacao', None) if empresa else None
    
    context = {
        'cart': cart,
        'empresa': empresa,
        'customizacao': customizacao
    }
    return render(request, 'carrinho_detalhe.html', context)

class HistoricoPedidosView(LoginRequiredMixin, ListView):
    model = Pedido
    template_name = 'pedidos.html'
    context_object_name = 'pedidos'

    def get_queryset(self):
        return Pedido.objects.filter(cliente__usuario=self.request.user).order_by('-criado_em')

    # --- INJETANDO AS VARIÁVEIS NO TEMPLATE ---
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # 1. Pega a empresa
        empresa = PerfilEmpresa.objects.first()
        context['empresa'] = empresa
        
        # 2. Pega a customizacao e envia para o template
        if empresa and hasattr(empresa, 'customizacao'):
            context['customizacao'] = empresa.customizacao
        else:
            context['customizacao'] = None
            
        return context

@login_required
@user_passes_test(eh_equipe)
def painel_kanban_view(request):
    pendentes = Pedido.objects.filter(status=Pedido.StatusPedido.AGUARDANDO_PAGAMENTO).order_by('criado_em')
    em_andamento = Pedido.objects.filter(status=Pedido.StatusPedido.EM_ANDAMENTO).order_by('criado_em')
    prontos = Pedido.objects.filter(status=Pedido.StatusPedido.PRONTO).order_by('criado_em')

    context = {
        'pendentes': pendentes,
        'em_andamento': em_andamento,
        'prontos': prontos,
    }
    return render(request, 'painel_kanban.html', context)

@login_required
@user_passes_test(eh_equipe)
def api_atualizar_status_kanban(request, pedido_id):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            novo_status = data.get('novo_status')
            
            if novo_status not in Pedido.StatusPedido.values:
                return JsonResponse({'success': False, 'error': 'Status inválido'}, status=400)

            pedido = get_object_or_404(Pedido, id=pedido_id)
            pedido.status = novo_status
            pedido.save()
            
            return JsonResponse({
                'success': True, 
                'message': f'Pedido #{pedido.id} mudou para {pedido.get_status_display()}'
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return JsonResponse({'success': False, 'error': 'Método não permitido'}, status=405)

# --- NOVA VIEW: ATUALIZAÇÃO EM LOTE ---
@login_required
@user_passes_test(eh_equipe)
def api_atualizar_lote_kanban(request):
    """
    Recebe uma lista de IDs e um novo status, atualizando todos de uma vez.
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            pedido_ids = data.get('pedido_ids', [])
            novo_status = data.get('novo_status')

            if not pedido_ids or not isinstance(pedido_ids, list):
                return JsonResponse({'success': False, 'error': 'Lista de IDs inválida'}, status=400)

            if novo_status not in Pedido.StatusPedido.values:
                return JsonResponse({'success': False, 'error': 'Status inválido'}, status=400)

            # Atualização em massa (Bulk Update) - Mais performático
            rows_updated = Pedido.objects.filter(id__in=pedido_ids).update(status=novo_status)

            return JsonResponse({
                'success': True,
                'message': f'{rows_updated} pedidos atualizados para {novo_status}.'
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)

    return JsonResponse({'success': False, 'error': 'Método não permitido'}, status=405)

@login_required
@user_passes_test(eh_equipe)
def api_limpar_prontos(request):
    if request.method == 'POST':
        try:
            rows_updated = Pedido.objects.filter(status=Pedido.StatusPedido.PRONTO).update(status=Pedido.StatusPedido.ENTREGUE)
            return JsonResponse({
                'success': True, 
                'message': f'{rows_updated} pedidos foram marcados como Entregues.'
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
    return JsonResponse({'success': False, 'error': 'Método não permitido'}, status=405)

@login_required
@user_passes_test(eh_equipe)
def gerar_pdf_pedido(request, pedido_id):
    pedido = get_object_or_404(Pedido, id=pedido_id)
    empresa = getattr(request.user, 'perfil_empresa', None)
    
    context = {'pedido': pedido, 'empresa': empresa, 'data_impressao': timezone.now()}
    template_path = 'pedidos/pedido_impressao.html'
    template = get_template(template_path)
    html = template.render(context)

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="pedido_{pedido.id}.pdf"'

    pisa_status = pisa.CreatePDF(html, dest=response)
    if pisa_status.err:
       return HttpResponse('Erro ao gerar PDF', status=500)
    return response