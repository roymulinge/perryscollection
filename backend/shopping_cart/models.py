from django.db import models
from django.conf import settings
from products.models import Product

# Create your models here.
class Cart(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete = models.CASCADE,
        related_name='cart'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Cart ({self.user.email})"

class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name = 'items'
    )
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null = True, blank=True, related_name='cart_items')
    
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['cart', 'product']]
        ordering = ['added_at']

    def __str__(self):
        product_name = self.product.name if self.product else 'Deleted product'
        return f"{product_name} x {self.quantity} in {self.cart.user.email}'s cart"
    
    @property
    def total_price(self):
         if not self.product:
            return 0
         return self.product.price * self.quantity
