from django.urls import path
from . import views

app_name = 'financeiro'

urlpatterns = [
    path('painel/', views.painel_financeiro_view, name='painel'),
]