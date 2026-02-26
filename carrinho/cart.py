from decimal import Decimal
from django.conf import settings
from catalogo.models import Produto
import uuid  # Importa a biblioteca para gerar IDs únicos

class Cart:
    def __init__(self, request):
        self.session = request.session
        cart = self.session.get(settings.CART_SESSION_ID)
        if not cart:
            cart = self.session[settings.CART_SESSION_ID] = {}
        self.cart = cart

    def add(self, product, quantity=1, observation=''):
        """
        Adiciona um produto ao carrinho, sempre como um novo item com um ID único.
        """
        # Gera um ID único (UUID) para cada item adicionado.
        item_id = str(uuid.uuid4())
        
        self.cart[item_id] = {
            'product_id': product.id,
            'quantity': quantity,
            'price': str(product.preco),
            'observation': observation,
        }
        self.save()

    def update(self, item_id, quantity, observation=None):
        """ Atualiza um item específico no carrinho usando seu ID único. """
        if item_id in self.cart:
            if quantity > 0:
                self.cart[item_id]['quantity'] = quantity
                if observation is not None:
                    self.cart[item_id]['observation'] = observation
                self.save()
            else:
                self.remove(item_id)

    def save(self):
        self.session.modified = True

    def remove(self, item_id):
        """ Remove um item específico do carrinho usando seu ID único. """
        if item_id in self.cart:
            del self.cart[item_id]
            self.save()

    def __iter__(self):
        product_ids = [item['product_id'] for item in self.cart.values()]
        products = Produto.objects.filter(id__in=product_ids).prefetch_related('imagens')
        product_map = {p.id: p for p in products}

        for item_id, item_data in self.cart.items():
            product = product_map.get(item_data['product_id'])
            if not product:
                continue

            price = Decimal(item_data['price'])
            yield {
                'id': item_id, # Passa o ID único para o serializer
                'quantity': item_data['quantity'],
                'price': price,
                'total_price': price * item_data['quantity'],
                'observation': item_data['observation'],
                'product': product,
            }

    def __len__(self):
        return sum(item['quantity'] for item in self.cart.values())

    def get_total_price(self):
        return sum(Decimal(item['price']) * item['quantity'] for item in self.cart.values())

    def clear(self):
        if settings.CART_SESSION_ID in self.session:
            del self.session[settings.CART_SESSION_ID]
            self.save()

