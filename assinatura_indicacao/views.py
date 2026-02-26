from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .models import CodigoIndicador, Indicacao

@login_required
def painel_indicacoes_view(request):
    """
    Exibe o código de indicação do usuário logado e o histórico.
    """
    # Garante que o usuário tenha um código gerado
    codigo_obj, created = CodigoIndicador.objects.get_or_create(usuario=request.user)
    
    # Busca histórico
    minhas_indicacoes = Indicacao.objects.filter(indicador=codigo_obj).order_by('-data_indicacao')
    
    # Totais
    total_indicados = minhas_indicacoes.count()
    total_convertidos = minhas_indicacoes.filter(status='APROVADO').count()
    
    # Lógica simples de benefício para exibição
    tipo_beneficio = "Mês Grátis" if hasattr(request.user, 'perfil_empresa') else "R$ 50,00"

    context = {
        'codigo': codigo_obj.codigo,
        'indicacoes': minhas_indicacoes,
        'total_indicados': total_indicados,
        'total_convertidos': total_convertidos,
        'tipo_beneficio': tipo_beneficio,
    }
    
    # --- CORREÇÃO AQUI ---
    # Aponta para o arquivo na raiz da pasta templates/
    return render(request, 'assinatura_indicacao.html', context)
