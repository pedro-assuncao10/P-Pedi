from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin

class CheckoutView(LoginRequiredMixin, TemplateView):
    template_name = 'checkout.html' # Ou 'pagamentos/checkout.html' dependendo da sua pasta
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        
        perfil = None
        endereco = None
        dados_completos = False

        # Verifica se tem perfil
        if hasattr(user, 'perfilcliente'):
            perfil = user.perfilcliente
            # Verifica se tem endereço
            endereco = perfil.enderecos.filter(is_principal=True).first()
            if not endereco:
                endereco = perfil.enderecos.first()
        
        # Se tiver perfil E endereço, os dados estão completos
        if perfil and endereco:
            dados_completos = True

        context['endereco'] = endereco
        context['perfil'] = perfil
        context['dados_completos'] = dados_completos
        return context