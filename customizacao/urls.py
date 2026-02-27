from django.urls import path
from . import views

app_name = 'customizacao'

urlpatterns = [
    path('painel/', views.customizacao_view, name='painel'),
]