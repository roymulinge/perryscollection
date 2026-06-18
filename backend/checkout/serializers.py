from rest_framework import serializers
from .models import Order, OrderItem
from products.models import Product
from decimal import Decimal

class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_sku', 'quantity', 'price', 'subtotal']


class OrderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for order list views."""
    class Meta:
        model = Order
        fields = ['id', 'created_at', 'status', 'total_amount', 'is_paid']


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_amount']


class CheckoutSerializer(serializers.Serializer):
    """
    Validates checkout data from frontend.
    """
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=200)
    address_line1 = serializers.CharField(max_length=255)
    address_line2 = serializers.CharField(max_length=255, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=100)
    
    # Optional for logged-in users
    save_address = serializers.BooleanField(default=False)

      # ── NEW fields for payment ──
    payment_method = serializers.ChoiceField(
        choices=['mpesa', 'cash_on_delivery'],
        default='cash_on_delivery'
    )
    # phone_number is required ONLY when paying via M-Pesa — validated
    # in the cross-field validate() method below, not here individually,
    # because "required" depends on another field's value
    phone_number = serializers.CharField(max_length=15, required=False, allow_blank=True)

    def validate(self, data):
        """
        Cross-field validation: M-Pesa payments MUST include a phone number.
        Cash on Delivery doesn't need one (though it's nice to have for
        delivery coordination — that's a future improvement).
        """
        if data.get('payment_method') == 'mpesa' and not data.get('phone_number', '').strip():
            raise serializers.ValidationError({
                'phone_number': 'Phone number is required for M-Pesa payments.'
            })
        return data