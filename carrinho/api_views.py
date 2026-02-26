from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .cart import Cart
from catalogo.models import Produto
from .serializers import CartSerializer

class CartDetailAPIView(APIView):
    def get(self, request, format=None):
        cart = Cart(request)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

class CartAddAPIView(APIView):
    def post(self, request, product_id, format=None):
        cart = Cart(request)
        product = get_object_or_404(Produto, id=product_id)
        quantity = request.data.get('quantity', 1)
        observation = request.data.get('observation', '')
        cart.add(product=product, quantity=int(quantity), observation=observation)
        serializer = CartSerializer(cart)
        return Response(serializer.data, status=status.HTTP_200_OK)

class CartRemoveAPIView(APIView):
    # Recebe 'item_id' (string) da URL
    def post(self, request, item_id, format=None):
        cart = Cart(request)
        cart.remove(item_id)
        serializer = CartSerializer(cart)
        return Response(serializer.data, status=status.HTTP_200_OK)

class CartUpdateAPIView(APIView):
    # Recebe 'item_id' (string) da URL
    def post(self, request, item_id, format=None):
        cart = Cart(request)
        quantity = request.data.get('quantity')
        observation = request.data.get('observation')
        if quantity is not None:
            cart.update(item_id=item_id, quantity=int(quantity), observation=observation)
            serializer = CartSerializer(cart)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response({'error': 'Dados inválidos.'}, status=status.HTTP_400_BAD_REQUEST)

class CartClearAPIView(APIView):
    def post(self, request, format=None):
        cart = Cart(request)
        cart.clear()
        serializer = CartSerializer(cart)
        return Response(serializer.data, status=status.HTTP_200_OK)

