from rest_framework import serializers

from products.models import Product


class CartItemProductSerializer(serializers.ModelSerializer):
    """
    Minimal product representation returned inside a cart item.

    Product price and availability are always read from the
    current Product record.
    """

    image_url = serializers.SerializerMethodField()

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    class Meta:
        model = Product

        fields = [
            "id",
            "name",
            "slug",
            "price",
            "stock",
            "image_url",
            "category_name",
            "is_active",
            "available",
        ]

        read_only_fields = fields

    def get_image_url(self, obj):
        if not obj.image:
            return None

        url = obj.image.url

        if "res.cloudinary.com" in url and "/upload/" in url:
            url = url.replace(
                "/upload/",
                "/upload/f_auto,q_auto,w_800/",
            )

        return url


class CartItemSerializer(serializers.Serializer):
    """
    Representation of one CartItem.

    Price and availability are derived from the current Product.
    """

    product = CartItemProductSerializer(
        read_only=True,
    )

    quantity = serializers.IntegerField(
        min_value=1,
        read_only=True,
    )

    price = serializers.SerializerMethodField()

    total_price = serializers.SerializerMethodField()

    is_available = serializers.SerializerMethodField()

    stock_remaining = serializers.SerializerMethodField()

    def get_price(self, obj):
        if not obj.product:
            return 0

        return obj.product.price

    def get_total_price(self, obj):
        if not obj.product:
            return 0

        return obj.product.price * obj.quantity

    def get_is_available(self, obj):
        if not obj.product:
            return False

        product = obj.product

        return (
            product.is_active
            and product.available
            and product.stock > 0
        )

    def get_stock_remaining(self, obj):
        if not obj.product:
            return 0

        return obj.product.stock


class CartSerializer(serializers.Serializer):
    """
    Full cart representation.
    """

    id = serializers.IntegerField(
        read_only=True,
    )

    status = serializers.CharField(
        read_only=True,
    )

    items = CartItemSerializer(
        many=True,
        read_only=True,
    )

    total_items = serializers.SerializerMethodField()

    total_price = serializers.SerializerMethodField()

    def get_total_items(self, cart):
        return sum(
            item.quantity
            for item in cart.items.all()
        )

    def get_total_price(self, cart):
        return sum(
            (
                item.product.price * item.quantity
                for item in cart.items.select_related("product").all()
                if item.product
            ),
            0,
        )


class AddToCartSerializer(serializers.Serializer):
    """
    Input serializer for adding a product to a cart.
    """

    product_id = serializers.IntegerField(
        min_value=1,
    )

    quantity = serializers.IntegerField(
        min_value=1,
        default=1,
    )


class UpdateCartItemSerializer(serializers.Serializer):
    """
    Input serializer for changing an item's quantity.

    quantity = 0 means remove the item.
    """

    quantity = serializers.IntegerField(
        min_value=0,
    )