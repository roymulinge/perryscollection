from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import models

from .models import Product, Category
from .serializers import (
    ProductListSerializer,
    ProductDetailSerializer,
    CategorySerializer,
)
from .pagination import get_page_number


class HomeAPIView(APIView):
    """
    GET /

    Returns featured products and all categories.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        featured_products = Product.objects.filter(
            available=True,
            is_active=True,
            featured=True,
        ).select_related('category').order_by('-created_at')

        categories = cache.get('all_categories')

        if not categories:
            categories = list(Category.objects.all())
            cache.set('all_categories', categories, 3600)

        return Response({
            'featured_products': ProductListSerializer(
                featured_products,
                many=True,
                context={'request': request},
            ).data,

            'categories': CategorySerializer(
                categories,
                many=True,
                context={'request': request},
            ).data,
        })


class CategoryListAPIView(APIView):
    """
    GET /categories/

    Returns all categories.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        categories = Category.objects.all().order_by('name')

        serializer = CategorySerializer(
            categories,
            many=True,
            context={'request': request},
        )

        return Response(serializer.data)


class CategoryDetailAPIView(APIView):
    """
    GET /categories/<slug>/

    Returns category information and paginated products.
    """

    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            category = Category.objects.get(slug=slug)
        except Category.DoesNotExist:
            return Response(
                {'error': 'Category not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # -------------------------
        # Pagination validation
        # -------------------------

        try:
            page = get_page_number(request)
        except ValidationError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------
        # Products
        # -------------------------

        products = Product.objects.filter(
            category=category,
            available=True,
            is_active=True,
        ).order_by('-created_at')

        page_size = 20

        start = (page - 1) * page_size
        end = start + page_size

        total = products.count()
        paginated = products[start:end]

        total_pages = (total + page_size - 1) // page_size

        return Response({
            'category': CategorySerializer(
                category,
                context={'request': request},
            ).data,

            'products': ProductListSerializer(
                paginated,
                many=True,
                context={'request': request},
            ).data,

            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': total_pages,
                'has_next': end < total,
                'has_previous': page > 1,
            },
        })


class ProductListAPIView(APIView):
    """
    GET /products/

    Supports:

    ?featured=true
    ?q=boots
    ?page=2
    """

    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Product.objects.filter(
            available=True,
            is_active=True,
        ).select_related('category')

        # -------------------------
        # Featured filter
        # -------------------------

        featured_filter = request.query_params.get('featured')

        if featured_filter == 'true':
            queryset = queryset.filter(featured=True)

        # -------------------------
        # Search filter
        # -------------------------

        search_term = request.query_params.get('q')

        if search_term:
            queryset = queryset.filter(
                models.Q(name__icontains=search_term)
                | models.Q(sku__icontains=search_term)
                | models.Q(description__icontains=search_term)
            )

        queryset = queryset.order_by('-created_at')

        # -------------------------
        # Pagination validation
        # -------------------------

        try:
            page = get_page_number(request)
        except ValidationError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        page_size = 24

        start = (page - 1) * page_size
        end = start + page_size

        total = queryset.count()
        paginated = queryset[start:end]

        total_pages = (total + page_size - 1) // page_size

        return Response({
            'products': ProductListSerializer(
                paginated,
                many=True,
                context={'request': request},
            ).data,

            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': total_pages,
                'has_next': end < total,
                'has_previous': page > 1,
            },

            'filters': {
                'search': search_term or '',
                'featured': featured_filter or '',
            },
        })


class ProductDetailAPIView(APIView):
    """
    GET /products/<slug>/

    Returns full details for one publicly available product.
    """

    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            product = Product.objects.select_related('category').get(
                slug=slug,
                available=True,
                is_active=True,
            )
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProductDetailSerializer(
            product,
            context={'request': request},
        )

        return Response(serializer.data)