from rest_framework import serializers
from catalogo.models import Produto, ImagemProduto

class ImagemProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagemProduto
        fields = ['imagem']

class CartProductSerializer(serializers.ModelSerializer):
    imagens = ImagemProdutoSerializer(many=True, read_only=True)
    class Meta:
        model = Produto
        fields = ['id', 'nome', 'preco', 'imagens']

class CartItemSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True) # ID único do item no carrinho
    quantity = serializers.IntegerField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    observation = serializers.CharField(allow_blank=True)
    product = CartProductSerializer()

class CartSerializer(serializers.Serializer):
    items = CartItemSerializer(many=True, source='__iter__')
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, source='get_total_price')

