from rest_framework import serializers

from products.models import Product


class CartItemProductSerializer(serializers.ModelSerializer):
    """
    Minimal product representation returned inside a cart item.
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
    Representation of one CartItem in an API response.
    """

    product = CartItemProductSerializer(read_only=True)

    quantity = serializers.IntegerField(
        min_value=1,
        read_only=True,
    )

    price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    total_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    is_available = serializers.BooleanField(
        read_only=True,
    )

    stock_remaining = serializers.IntegerField(
        read_only=True,
    )


class CartSerializer(serializers.Serializer):
    """
    Full cart representation.
    """

    id = serializers.IntegerField(read_only=True)

    status = serializers.CharField(read_only=True)

    items = CartItemSerializer(
        many=True,
        read_only=True,
    )

    total_items = serializers.IntegerField(
        read_only=True,
    )

    total_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
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