# products/serializers.py
from rest_framework import serializers
from rest_framework.reverse import reverse
from .models import Category, Product


class CategorySerializer(serializers.HyperlinkedModelSerializer):
    url = serializers.HyperlinkedIdentityField(
        view_name='products:category_detail',
        lookup_field='slug'
    )
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'url', 'product_count', 'created_at']
        read_only_fields = ['created_at']

    def get_product_count(self, obj):
        return obj.products.filter(available=True, is_active=True).count()


class ProductListSerializer(serializers.HyperlinkedModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_url = serializers.HyperlinkedRelatedField(
        view_name='products:category_detail',
        lookup_field='slug',
        source='category',
        read_only=True
    )
    # ✅ FIX: declare image_url as a SerializerMethodField
    # Previously it was listed in `fields` but never declared — Django REST would crash
    image_url = serializers.SerializerMethodField()
    absolute_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'slug', 'price',
            'compare_at_price', 'stock', 'available', 'featured',
            'category_name', 'category_url', 'image_url', 'absolute_url',
            'in_stock', 'is_low_stock'
        ]
        read_only_fields = ['sku', 'slug', 'created_at', 'updated_at']

    def get_absolute_url(self, obj):
        return reverse('products:product_detail', args=[obj.slug], request=self.context.get('request'))

    def get_image_url(self, obj):
        # Build full URL if image exists, otherwise return None
        if obj.image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None


class ProductDetailSerializer(serializers.HyperlinkedModelSerializer):
    category = CategorySerializer(read_only=True)
    # ✅ FIX: same issue here — declare it
    image_url = serializers.SerializerMethodField()
    related_products = serializers.SerializerMethodField()
    absolute_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'slug', 'description',
            'price', 'compare_at_price', 'stock', 'available',
            'featured', 'is_active', 'category', 'image_url',
            'absolute_url', 'in_stock', 'is_low_stock',
            'created_at', 'updated_at', 'related_products'
        ]
        read_only_fields = ['sku', 'slug', 'created_at', 'updated_at']

    def get_absolute_url(self, obj):
        return reverse('products:product_detail', args=[obj.slug], request=self.context.get('request'))

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None

    def get_related_products(self, obj):
        related = Product.objects.filter(
            category=obj.category,
            available=True,
            is_active=True
        ).exclude(id=obj.id)[:4]
        return ProductListSerializer(related, many=True, context=self.context).data

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate(self, data):
        if data.get('stock', 0) == 0 and data.get('available', False):
            raise serializers.ValidationError("Cannot mark product as available with zero stock.")
        compare = data.get('compare_at_price')
        price = data.get('price')
        if compare and compare <= price:
            raise serializers.ValidationError("Compare-at price must be greater than current price.")
        return data