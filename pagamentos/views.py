from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from empresas.models import PerfilEmpresa
from logistica.models import BairroEntrega # <-- IMPORTANTE: Importamos o modelo de bairros
from django.conf import settings

class CheckoutView(LoginRequiredMixin, TemplateView):
    template_name = 'checkout.html' 
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        
        perfil = None
        endereco = None
        dados_completos = False

        if hasattr(user, 'perfilcliente'):
            perfil = user.perfilcliente
            endereco = perfil.enderecos.filter(is_principal=True).first()
            if not endereco:
                endereco = perfil.enderecos.first()
        
        if perfil and endereco:
            dados_completos = True

        context['endereco'] = endereco
        context['perfil'] = perfil
        context['dados_completos'] = dados_completos
        
        # --- LÓGICA DE CUSTOMIZAÇÃO E CONFIGURAÇÃO ---
        empresa = PerfilEmpresa.objects.first()
        
        # Busca os bairros cadastrados na logística para o select de taxas
        bairros_entrega = []
        if empresa:
            bairros_entrega = BairroEntrega.objects.filter(empresa=empresa).order_by('nome')
        
        customizacao = None
        if empresa and hasattr(empresa, 'customizacao'):
            customizacao = empresa.customizacao
        
        context['empresa'] = empresa
        context['configuracao'] = empresa 
        context['customizacao'] = customizacao
        context['loja_aberta'] = empresa.is_aberto if empresa else True
        
        # Envia a lista de bairros para o HTML
        context['bairros_entrega'] = bairros_entrega

        context['mapbox_token'] = settings.MAPBOX_TOKEN
        print("MAPBOX_TOKEN no checkout:", settings.MAPBOX_TOKEN)  # Debug para verificar o token
        
        return context