from django.urls import path
from . import views
from . import api_views

app_name = 'usuarios'

urlpatterns = [
    # Rota para a função de logout
    path('sair/', views.logout_view, name='logout'),
    path('login/', views.login_view, name='login'),

    # Rotas de API para os modais
    path('api/alterar-senha/', api_views.AlterarSenhaAPIView.as_view(), name='api_alterar_senha'),
    path('cadastro/', views.cadastro_view, name='cadastro'),
]

