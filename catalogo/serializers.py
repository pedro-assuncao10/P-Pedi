# catalogo/serializers.py
from rest_framework import serializers
from .models import Categoria, Produto, ImagemProduto

class ImagemProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagemProduto
        fields = ['id', 'imagem', 'alt_text']

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nome', 'slug', 'categoria_pai']

class ProdutoSerializer(serializers.ModelSerializer):
    # Serializer aninhado para mostrar os detalhes da categoria (somente leitura)
    categoria = CategoriaSerializer(read_only=True)
    # Campo para receber o ID da categoria ao criar/atualizar um produto
    categoria_id = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.all(), source='categoria', write_only=True
    )
    # Serializer aninhado para mostrar as imagens associadas (somente leitura)
    imagens = ImagemProdutoSerializer(many=True, read_only=True)
    
    # Campo para upload de novas imagens ao criar/atualizar
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )

    class Meta:
        model = Produto
        fields = [
            'id', 'nome', 'slug', 'descricao', 'preco', 'estoque', 'is_disponivel',
            'categoria', 'categoria_id', 'imagens', 'uploaded_images'
        ]

    def create(self, validated_data):
        # Remove o campo de imagens do dicionário principal
        uploaded_images = validated_data.pop('uploaded_images', [])
        # Cria a instância do produto
        produto = Produto.objects.create(**validated_data)
        # Cria as instâncias de ImagemProduto para cada imagem enviada
        for image in uploaded_images:
            ImagemProduto.objects.create(produto=produto, imagem=image)
        return produto

    def update(self, instance, validated_data):
        # Remove o campo de imagens do dicionário principal
        uploaded_images = validated_data.pop('uploaded_images', [])
        # Atualiza a instância do produto com os dados restantes
        instance = super().update(instance, validated_data)
        # Cria as novas imagens associadas
        for image in uploaded_images:
            ImagemProduto.objects.create(produto=instance, imagem=image)
        return instance
