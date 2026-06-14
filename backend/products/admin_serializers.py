# products/admin_serializers.py
# ─────────────────────────────────────────────────────────────────
# WHY SEPARATE SERIALIZERS FOR ADMIN?
# Your public ProductListSerializer is read-only and shows limited
# fields. The admin needs:
#   - All fields including is_active, low_stock_threshold, sku
#   - Write support (POST, PUT, PATCH)
#   - Image upload handling
#   - Category creation inline
#
# Mixing all this into one serializer creates a mess. Keep them
# separate — public serializers stay lean, admin serializers are full.
# ─────────────────────────────────────────────────────────────────

from rest_framework import serializers
from .models import Product, Category


class AdminCategorySerializer(serializers.ModelSerializer):
    """
    Full read/write serializer for Category.
    Used by the admin to create and list categories.
    """

    # product_count: how many active products are in this category.
    # read_only=True because it's computed, not stored in the DB.
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        # All fields exposed to the admin
        fields = ['id', 'name', 'slug', 'product_count', 'created_at', 'updated_at']
        # slug is auto-generated from name in Category.save() — don't require it
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']

    def get_product_count(self, obj):
        # obj is the Category instance being serialized
        # .filter() narrows to only products the customer can see
        return obj.products.filter(is_active=True).count()


class AdminProductSerializer(serializers.ModelSerializer):
    """
    Full read/write serializer for Product.
    Handles both list views and create/update operations.
    """

    # category_name: a flat string for display in the product table.
    # source='category.name' tells DRF to traverse the FK relationship.
    # read_only because we set the category via the `category` FK field.
    category_name = serializers.CharField(source='category.name', read_only=True)

    # image_url: the full URL of the product image for display.
    # We derive this from the image field — it's not stored separately.
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'slug', 'description',
            'price', 'compare_at_price',
            'stock', 'low_stock_threshold', 'available', 'is_active',
            'featured', 'image', 'image_url',
            'category', 'category_name',
            'stock_value', 'in_stock', 'is_low_stock',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'slug',           # auto-generated
            'category_name',        # derived field
            'image_url',            # derived field
            'stock_value',          # @property on model
            'in_stock',             # @property on model
            'is_low_stock',         # @property on model
            'created_at', 'updated_at',
        ]

        # image field uses Django's ImageField — DRF handles multipart/form-data
        # automatically when the serializer is used with a file upload

    def get_image_url(self, obj):
        """Build absolute URL for the product image."""
        if obj.image:
            # self.context['request'] is passed in by the view
            # build_absolute_uri converts '/media/products/img.jpg'
            # to 'http://127.0.0.1:8000/media/products/img.jpg'
            request = self.context.get('request')
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None

    def validate_price(self, value):
        """Price must be positive."""
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate(self, data):
        """Cross-field validation: compare_at_price must exceed price."""
        compare = data.get('compare_at_price')
        price = data.get('price')
        if compare and price and compare <= price:
            raise serializers.ValidationError({
                'compare_at_price': "Compare-at price must be greater than the current price."
            })
        return data


class AdminOrderItemSerializer(serializers.ModelSerializer):
    """Nested serializer for order items shown inside an order."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku  = serializers.CharField(source='product.sku',  read_only=True)

    class Meta:
        from checkout.models import OrderItem
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_sku',
                  'quantity', 'price', 'subtotal']
        read_only_fields = fields  # order items are never edited via admin


class AdminOrderSerializer(serializers.ModelSerializer):
    """
    Full order serializer for the admin panel.
    Includes nested items and customer details.
    Only the status field is writable — admins change status, not order contents.
    """
    items = AdminOrderItemSerializer(many=True, read_only=True)
    customer_email = serializers.EmailField(source='email', read_only=True)

    class Meta:
        from checkout.models import Order
        model = Order
        fields = [
            'id', 'customer_email', 'full_name',
            'address_line1', 'address_line2', 'city', 'postal_code', 'country',
            'status', 'is_paid', 'paid_at', 'total_amount',
            'payment_intent_id', 'items',
            'created_at', 'updated_at',
        ]
        # Only status is patchable — changing anything else would be wrong
        read_only_fields = [f for f in fields if f != 'status']


class DashboardStatsSerializer(serializers.Serializer):
    """
    Serializer for the dashboard summary numbers.
    This is a plain Serializer (not ModelSerializer) because the
    data comes from aggregation queries, not a single model instance.
    """
    total_products   = serializers.IntegerField()
    active_products  = serializers.IntegerField()
    total_orders     = serializers.IntegerField()
    pending_orders   = serializers.IntegerField()
    total_revenue    = serializers.DecimalField(max_digits=12, decimal_places=2)
    low_stock_count  = serializers.IntegerField()
    out_of_stock_count = serializers.IntegerField()