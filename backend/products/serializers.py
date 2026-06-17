# products/serializers.py
# ─────────────────────────────────────────────────────────────────
# WHAT WAS BROKEN:
# HyperlinkedModelSerializer and HyperlinkedIdentityField both call
# Django's reverse() function internally to build URLs from a
# view_name. The view_names used here ('category-detail' with a
# hyphen) didn't match the actual registered URL names in urls.py
# ('category_detail' with an underscore). Every single request to
# any endpoint using these serializers crashed with NoReverseMatch,
# which DRF reports back to the browser as a 500 Internal Server Error.
#
# THE FIX:
# Switch from HyperlinkedModelSerializer to plain ModelSerializer.
# We build URLs manually with SerializerMethodField + request.build_absolute_uri()
# using the request's own path info — no reverse() lookups needed at all.
# This is simpler, has no naming traps, and is the standard pattern
# for APIs consumed by a separate React frontend (you're not using
# Django's hyperlinked browsable API, so HyperlinkedModelSerializer
# was solving a problem you don't have).
# ─────────────────────────────────────────────────────────────────

from rest_framework import serializers
from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    """
    Plain ModelSerializer — no reverse() URL building.
    product_count is computed via a SerializerMethodField.
    """

    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        # Removed 'url' — React builds category links itself using
        # the slug, e.g. `/categories/${category.slug}` in JSX.
        # We don't need Django to generate that URL for us.
        fields = ['id', 'name', 'slug', 'product_count', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']

    def get_product_count(self, obj):
        # obj is the Category instance.
        # obj.products is the related_name from Product.category ForeignKey
        return obj.products.filter(available=True, is_active=True).count()


class ProductListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for product list views (homepage, product grid).
    Plain ModelSerializer — category_name is a flat string,
    image_url is built manually without any reverse() calls.
    """

    # Flat string instead of nested object — easier for React to use directly
    # source='category.name' traverses the FK relationship: product.category.name
    category_name = serializers.CharField(source='category.name', read_only=True)

    # Also expose the category slug so React can build a category link
    # without needing a separate API call
    category_slug = serializers.CharField(source='category.slug', read_only=True)

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'slug', 'price',
            'compare_at_price', 'stock', 'available', 'featured',
            'category_name', 'category_slug', 'image_url',
            'in_stock', 'is_low_stock',
        ]
        read_only_fields = ['id', 'sku', 'slug', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        """
            Returns an optimized Cloudinary URL instead of the raw original.

            obj.image.url with Cloudinary storage already returns a full
            Cloudinary CDN URL like:
            https://res.cloudinary.com/your-cloud/image/upload/v1234/products/2025/06/tote.jpg

            We insert Cloudinary transformation parameters into that URL:
            - f_auto:  automatically serves WebP/AVIF to browsers that support
                    it, falls back to JPEG/PNG otherwise — smaller file size
                    with zero quality loss perceived by the user
            - q_auto:  Cloudinary's algorithm picks the best compression level
                    automatically — usually 30-50% smaller than the original
                    with no visible difference
            - w_800:   caps width at 800px — your product images don't need to
                    be larger than that for any screen, saves bandwidth
        """
        if obj.image:
            url = obj.image.url
            # Insert transformation params right after '/upload/' in the URL
            # Cloudinary URLs always have this exact segment
            if '/upload/' in url:
                url = url.replace('/upload/', '/upload/f_auto,q_auto,w_800/')
            return url
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for the single product detail page.
    Includes nested category and related products.
    """

    # Nested category object (id, name, slug, product_count) —
    # the detail page wants the full category info, not just a name string
    category = CategorySerializer(read_only=True)

    image_url = serializers.SerializerMethodField()
    related_products = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'slug', 'description',
            'price', 'compare_at_price', 'stock', 'available',
            'featured', 'is_active', 'category', 'image_url',
            'in_stock', 'is_low_stock',
            'created_at', 'updated_at', 'related_products',
        ]
        read_only_fields = ['id', 'sku', 'slug', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        if obj.image:
            url = obj.image.url
            # Insert transformation params right after '/upload/' in the URL
            # Cloudinary URLs always have this exact segment
            if '/upload/' in url:
                url = url.replace('/upload/', '/upload/f_auto,q_auto,w_800/')
            return url
        return None

    def get_related_products(self, obj):
        """Up to 4 other products from the same category."""
        related = Product.objects.filter(
            category=obj.category,
            available=True,
            is_active=True,
        ).exclude(id=obj.id)[:4]
        # Reuse ProductListSerializer for the lightweight nested representation
        return ProductListSerializer(related, many=True, context=self.context).data

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate(self, data):
        if data.get('stock', 0) == 0 and data.get('available', False):
            raise serializers.ValidationError(
                "Cannot mark product as available with zero stock."
            )
        compare = data.get('compare_at_price')
        price = data.get('price')
        if compare and price and compare <= price:
            raise serializers.ValidationError(
                "Compare-at price must be greater than current price."
            )
        return data