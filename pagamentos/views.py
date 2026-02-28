from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin
from empresas.models import PerfilEmpresa

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
        
        # Forma segura de buscar a customização, igual à Home!
        customizacao = None
        if empresa and hasattr(empresa, 'customizacao'):
            customizacao = empresa.customizacao
        
        context['empresa'] = empresa
        context['configuracao'] = empresa 
        context['customizacao'] = customizacao
        context['loja_aberta'] = empresa.is_aberto if empresa else True
        
        return context