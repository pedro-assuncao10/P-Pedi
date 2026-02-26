from django.urls import path
from . import views

app_name = 'cupons'

urlpatterns = [
    path('', views.CupomListView.as_view(), name='lista_cupons'),
    path('novo/', views.CupomCreateView.as_view(), name='criar_cupom'),
    path('<int:pk>/editar/', views.CupomUpdateView.as_view(), name='editar_cupom'),
    path('<int:pk>/deletar/', views.CupomDeleteView.as_view(), name='deletar_cupom'),
]