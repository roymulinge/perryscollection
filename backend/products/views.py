# products/views.py

from rest_framework.views import APIView
# APIView is DRF's base class — gives us .get(), .post() etc. and returns JSON

from rest_framework.response import Response
# Response serializes data to JSON automatically

from rest_framework import status
# status.HTTP_200_OK, HTTP_404_NOT_FOUND etc. — readable status codes

from rest_framework.permissions import AllowAny
# AllowAny = no login required — your product catalog is public

from django.core.cache import cache
# Django's cache framework — we cache category list to avoid repeated DB hits

from django.db import models
# Needed for models.Q (used in search queries)

from .models import Product, Category
from .serializers import ProductListSerializer, ProductDetailSerializer, CategorySerializer


class HomeAPIView(APIView):
    """
    GET /
    Returns featured products + all categories.
    This replaces the old HomeView (ListView) that tried to render home.html.
    React will call this to build the homepage.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        # Fetch featured, active, available products
        featured_products = Product.objects.filter(
            available=True,
            is_active=True,
            featured=True
        ).select_related('category').order_by('-created_at')
        # select_related('category') = SQL JOIN — fetches category in same query
        # avoids N+1 problem (one query per product to get its category)

        # Try to get categories from cache first
        # Cache key: 'all_categories' | TTL: 3600 seconds (1 hour)
        categories = cache.get('all_categories')
        if not categories:
            # Cache miss — hit the database and store result
            categories = list(Category.objects.all())
            # list() forces evaluation NOW so we store data, not a lazy queryset
            cache.set('all_categories', categories, 3600)

        return Response({
            'featured_products': ProductListSerializer(
                featured_products,
                many=True,
                context={'request': request}   # needed for building absolute URLs
            ).data,
            'categories': CategorySerializer(
                categories,
                many=True,
                context={'request': request}
            ).data,
        })


class CategoryListAPIView(APIView):
    """
    GET /categories/
    Returns all categories.
    React uses this to render a category nav or filter sidebar.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        categories = Category.objects.all().order_by('name')
        serializer = CategorySerializer(categories, many=True, context={'request': request})
        return Response(serializer.data)


class CategoryDetailAPIView(APIView):
    """
    GET /categories/<slug>/
    Returns a category and its paginated products.
    """
    permission_classes = [AllowAny]

    def get(self, request, slug):
        # Try to find the category — 404 JSON response if not found
        try:
            category = Category.objects.get(slug=slug)
        except Category.DoesNotExist:
            return Response(
                {'error': 'Category not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get products in this category
        products = Product.objects.filter(
            category=category,
            available=True,
            is_active=True
        ).order_by('-created_at')

        # Manual pagination — read page number from query param e.g. ?page=2
        page = int(request.query_params.get('page', 1))  # default page 1
        page_size = 20                                    # 20 products per page
        start = (page - 1) * page_size                   # e.g. page 2 → start at index 20
        end = start + page_size                           # e.g. page 2 → end at index 40

        total = products.count()           # total matching products (before slicing)
        paginated = products[start:end]    # SQL LIMIT/OFFSET applied here

        return Response({
            'category': CategorySerializer(category, context={'request': request}).data,
            'products': ProductListSerializer(
                paginated,
                many=True,
                context={'request': request}
            ).data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': (total + page_size - 1) // page_size,
                # integer ceiling division: e.g. 45 items / 20 per page = 3 pages
                'has_next': end < total,
                'has_previous': page > 1,
            }
        })


class ProductListAPIView(APIView):
    """
    GET /products/
    Returns paginated product list.
    Supports:
    - ?featured=true        → only featured products
    - ?q=boots              → search by name, sku, description
    - ?page=2               → pagination
    """
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Product.objects.filter(
            available=True,
            is_active=True
        ).select_related('category')

        # --- Filter: featured ---
        featured_filter = request.query_params.get('featured')
        if featured_filter == 'true':
            queryset = queryset.filter(featured=True)

        # --- Filter: search ---
        # models.Q lets you combine WHERE clauses with OR (|)
        # Without Q: filter(name=x, sku=x) would be AND — nothing would match
        search_term = request.query_params.get('q')
        if search_term:
            queryset = queryset.filter(
                models.Q(name__icontains=search_term) |       # name contains term
                models.Q(sku__icontains=search_term) |        # OR sku contains term
                models.Q(description__icontains=search_term)  # OR description contains term
            )

        queryset = queryset.order_by('-created_at')

        # --- Pagination ---
        page = int(request.query_params.get('page', 1))
        page_size = 24
        start = (page - 1) * page_size
        end = start + page_size
        total = queryset.count()
        paginated = queryset[start:end]

        return Response({
            'products': ProductListSerializer(
                paginated,
                many=True,
                context={'request': request}
            ).data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': (total + page_size - 1) // page_size,
                'has_next': end < total,
                'has_previous': page > 1,
            },
            'filters': {
                # Echo back what filters were applied — useful for React state
                'search': search_term or '',
                'featured': featured_filter or '',
            }
        })


class ProductDetailAPIView(APIView):
    """
    GET /products/<slug>/
    Returns full product details.
    Only returns available + active products (same as before).
    """
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            product = Product.objects.select_related('category').get(
                slug=slug,
                available=True,
                is_active=True
            )
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ProductDetailSerializer(product, context={'request': request})
        return Response(serializer.data)