from rest_framework import serializers
from products.models import Product
from decimal import Decimal


class CartItemProductSerializer(serializers.ModelSerializer):
    """Minimal product info inside cart item."""
    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'price', 'stock', 'image']


class CartItemSerializer(serializers.Serializer):
    """One item in the cart."""
    product = CartItemProductSerializer(read_only=True)
    quantity = serializers.IntegerField(min_value=1)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)


class CartSerializer(serializers.Serializer):
    """Full cart representation."""
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)


class AddToCartSerializer(serializers.Serializer):
    """Request serializer for adding item."""
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)
    override = serializers.BooleanField(default=False)

    def validate_product_id(self, value):
        try:
            product = Product.objects.get(id=value, available=True, is_active=True)
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product not found or not available.")
        return product

    def validate(self, data):
        product = data['product_id']
        quantity = data['quantity']
        if quantity > product.stock:
            raise serializers.ValidationError(f"Only {product.stock} in stock.")
        return data


class UpdateCartSerializer(serializers.Serializer):
    """Request serializer for updating quantity."""
    quantity = serializers.IntegerField(min_value=0)

    def validate_quantity(self, value):
        if value == 0:
            return value   # removing
        if value < 0:
            raise serializers.ValidationError("Quantity must be non‑negative.")
        return value