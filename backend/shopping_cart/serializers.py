# shopping_cart/serializers.py
# ─────────────────────────────────────────────────────────────────
# WHAT CHANGED:
# CartItemProductSerializer now builds image_url the same way
# ProductListSerializer does — via SerializerMethodField with
# request.build_absolute_uri(). Without this, CartPage.jsx reading
# item.product.image gets a raw Cloudinary field object, not a
# usable string URL — the image either breaks or shows as [object].
# ─────────────────────────────────────────────────────────────────

from rest_framework import serializers
from products.models import Product
from decimal import Decimal


class CartItemProductSerializer(serializers.ModelSerializer):
    """
    Minimal product info embedded inside each cart item.
    Mirrors the same image_url pattern used in products/serializers.py
    so every part of the app gets a consistent, ready-to-use image URL.
    """

    # SerializerMethodField calls get_image_url() below — never expose
    # the raw `image` field directly, it's not a plain string
    image_url = serializers.SerializerMethodField()

    # Flat category name so CartPage can show it without a nested object
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'price', 'stock',
            'image_url', 'category_name',
            'is_active', 'available',  # so frontend can grey out stale items
        ]

    def get_image_url(self, obj):
        if not obj.image:
            return None

        url = obj.image.url

        # Only transform genuine Cloudinary URLs — see products/serializers.py
        # for the full explanation of why this guard exists
        if 'res.cloudinary.com' in url and '/upload/' in url:
            url = url.replace('/upload/', '/upload/f_auto,q_auto,w_800/')

        return url


class CartItemSerializer(serializers.Serializer):
    """One item in the cart."""
    product = CartItemProductSerializer(read_only=True)
    quantity = serializers.IntegerField(min_value=1)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    stock_remaining = serializers.IntegerField(read_only=True)

class CartSerializer(serializers.Serializer):
    """Full cart representation."""
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)


class AddToCartSerializer(serializers.Serializer):
    """Request serializer for adding an item to the cart."""
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)
    override = serializers.BooleanField(default=False)

    def validate_product_id(self, value):
        # ── FIX: also require is_active, matching the public catalog rules ──
        # Before, available=True alone let a soft-deleted (is_active=False)
        # product still be added to a cart via direct API call, even though
        # it no longer shows in the storefront.
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
        if value < 0:
            raise serializers.ValidationError("Quantity must be non‑negative.")
        return value