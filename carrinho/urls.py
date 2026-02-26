from django.urls import path
from . import api_views

app_name = 'carrinho'

urlpatterns = [
    path('api/', api_views.CartDetailAPIView.as_view(), name='api_detail'),
    path('api/add/<int:product_id>/', api_views.CartAddAPIView.as_view(), name='api_add'),
    # As rotas agora usam o conversor <str:> para o item_id
    path('api/remove/<str:item_id>/', api_views.CartRemoveAPIView.as_view(), name='api_remove'),
    path('api/update/<str:item_id>/', api_views.CartUpdateAPIView.as_view(), name='api_update'),
    path('api/clear/', api_views.CartClearAPIView.as_view(), name='api_clear'),
]

