# products/admin_views.py
# ─────────────────────────────────────────────────────────────────
# All admin API views.
#
# PATTERN USED: APIView from DRF
# Each class handles one URL endpoint.
# get()    → list or retrieve
# post()   → create
# put()    → full update
# patch()  → partial update (only send changed fields)
# delete() → delete
#
# ALL views require IsShopAdmin — regular users get 403 immediately.
# ─────────────────────────────────────────────────────────────────

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
# MultiPartParser: parses multipart/form-data (used for file uploads)
# FormParser:      parses application/x-www-form-urlencoded
# JSONParser:      parses application/json
# We need all three because the product form sends files + fields together

from django.db import models as django_models
from django.db.models import Sum, Count, Q
# Sum, Count: SQL aggregate functions
# Q: lets us combine WHERE clauses with OR (|) or AND (&)

from django.utils.text import slugify

from .models import Product, Category
from .permissions import IsShopAdmin
from .admin_serializers import (
    AdminProductSerializer,
    AdminCategorySerializer,
    AdminOrderSerializer,
    DashboardStatsSerializer,
)


# ── Dashboard ─────────────────────────────────────────────────────

class AdminDashboardView(APIView):
    """
    GET /api/admin/dashboard/
    Returns summary stats for the dashboard home screen.
    Numbers are computed via Django ORM aggregation — one DB round-trip each.
    """
    permission_classes = [IsShopAdmin]

    def get(self, request):
        from checkout.models import Order

        # Total revenue: sum of total_amount on all PAID orders
        # aggregate() returns a dict: {'total': Decimal('12345.00')} or {'total': None}
        revenue_result = Order.objects.filter(is_paid=True).aggregate(
            total=Sum('total_amount')
        )
        # Use `or 0` to handle the None case (no paid orders yet)
        total_revenue = revenue_result['total'] or 0

        stats = {
            # All products ever created
            'total_products': Product.objects.count(),

            # Products visible to customers right now
            'active_products': Product.objects.filter(
                is_active=True, available=True
            ).count(),

            # All orders placed
            'total_orders': Order.objects.count(),

            # Orders waiting to be processed
            'pending_orders': Order.objects.filter(status='pending').count(),

            'total_revenue': total_revenue,

            # Low stock: stock ≤ threshold but NOT zero
            # is_low_stock is a @property, so we can't filter on it directly.
            # We replicate the logic in a queryset filter instead.
            'low_stock_count': Product.objects.filter(
                is_active=True,
                stock__gt=0,            # stock > 0
                stock__lte=django_models.F('low_stock_threshold')
                # F('low_stock_threshold') references the column value per row
                # So: WHERE stock <= low_stock_threshold
            ).count(),

            # Completely out of stock
            'out_of_stock_count': Product.objects.filter(
                is_active=True, stock=0
            ).count(),
        }

        serializer = DashboardStatsSerializer(stats)
        return Response(serializer.data)


# ── Products ──────────────────────────────────────────────────────

class AdminProductListView(APIView):
    """
    GET  /api/admin/products/     → list all products (with search + filters)
    POST /api/admin/products/     → create a new product
    """
    permission_classes = [IsShopAdmin]
    # Tell DRF to also accept multipart/form-data (for image uploads)
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        queryset = Product.objects.select_related('category').order_by('-created_at')

        # Search: ?q=boots
        q = request.query_params.get('q', '').strip()
        if q:
            queryset = queryset.filter(
                Q(name__icontains=q) |
                Q(sku__icontains=q) |
                Q(description__icontains=q)
            )

        # Filter by category: ?category=1
        category_id = request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        # Filter by stock status: ?stock=low | ?stock=out
        stock_filter = request.query_params.get('stock')
        if stock_filter == 'low':
            queryset = queryset.filter(
                stock__gt=0,
                stock__lte=django_models.F('low_stock_threshold')
            )
        elif stock_filter == 'out':
            queryset = queryset.filter(stock=0)

        # Pagination
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = 20
        start = (page - 1) * page_size
        total = queryset.count()

        serializer = AdminProductSerializer(
            queryset[start:start + page_size],
            many=True,
            context={'request': request}
        )

        return Response({
            'products': serializer.data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': max(1, -(-total // page_size)),  # ceiling division
                'has_next': start + page_size < total,
                'has_previous': page > 1,
            }
        })

    def post(self, request):
        """
        Create a new product.
        Expects multipart/form-data so images can be uploaded in the same request.
        """
        serializer = AdminProductSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Generate SKU automatically if not provided
        # Format: PC-<category_id>-<timestamp_last4>
        if not request.data.get('sku'):
            import time
            cat_id = request.data.get('category', '0')
            sku = f"PC-{cat_id}-{str(int(time.time()))[-4:]}"
            # Save with the generated SKU by calling save() directly
            # passing sku as an override
            product = serializer.save(sku=sku)
        else:
            product = serializer.save()

        return Response(
            AdminProductSerializer(product, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class AdminProductDetailView(APIView):
    """
    GET    /api/admin/products/<id>/   → retrieve a single product
    PUT    /api/admin/products/<id>/   → full update
    PATCH  /api/admin/products/<id>/   → partial update (only changed fields)
    DELETE /api/admin/products/<id>/   → soft delete (sets is_active=False)
    """
    permission_classes = [IsShopAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_product(self, pk):
        """
        Private helper to fetch a product by PK.
        Returns (product, None) on success or (None, Response) on failure.
        Underscore prefix is Python convention for "internal use only".
        """
        try:
            return Product.objects.get(pk=pk), None
        except Product.DoesNotExist:
            return None, Response(
                {'error': 'Product not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

    def get(self, request, pk):
        product, error = self._get_product(pk)
        if error:
            return error
        return Response(
            AdminProductSerializer(product, context={'request': request}).data
        )

    def put(self, request, pk):
        """Full update — all required fields must be sent."""
        product, error = self._get_product(pk)
        if error:
            return error

        serializer = AdminProductSerializer(
            product,
            data=request.data,
            context={'request': request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        product = serializer.save()
        return Response(AdminProductSerializer(product, context={'request': request}).data)

    def patch(self, request, pk):
        """
        Partial update — only send the fields you want to change.
        partial=True tells the serializer not to require all fields.
        Used for quick actions like toggling `featured` or changing `stock`.
        """
        product, error = self._get_product(pk)
        if error:
            return error

        serializer = AdminProductSerializer(
            product,
            data=request.data,
            partial=True,           # ← the key difference from PUT
            context={'request': request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        product = serializer.save()
        return Response(AdminProductSerializer(product, context={'request': request}).data)

    def delete(self, request, pk):
        """
        Soft delete: sets is_active=False instead of actually deleting.
        WHY SOFT DELETE? Because orders reference products via FK.
        If you hard-delete a product, those order records break.
        Soft delete hides the product from customers but preserves history.
        """
        product, error = self._get_product(pk)
        if error:
            return error

        product.is_active = False
        product.available = False
        # update_fields: only UPDATE these two columns in the DB —
        # much faster than saving the whole model
        product.save(update_fields=['is_active', 'available'])

        return Response(
            {'message': f'Product "{product.name}" deactivated successfully.'},
            status=status.HTTP_200_OK
        )


# ── Categories ────────────────────────────────────────────────────

class AdminCategoryListView(APIView):
    """
    GET  /api/admin/categories/   → list all categories
    POST /api/admin/categories/   → create a category
    """
    permission_classes = [IsShopAdmin]

    def get(self, request):
        categories = Category.objects.all().order_by('name')
        return Response(
            AdminCategorySerializer(categories, many=True).data
        )

    def post(self, request):
        serializer = AdminCategorySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        category = serializer.save()
        return Response(
            AdminCategorySerializer(category).data,
            status=status.HTTP_201_CREATED
        )


class AdminCategoryDetailView(APIView):
    """
    PATCH  /api/admin/categories/<id>/   → rename a category
    DELETE /api/admin/categories/<id>/   → delete (blocked if products exist)
    """
    permission_classes = [IsShopAdmin]

    def patch(self, request, pk):
        try:
            category = Category.objects.get(pk=pk)
        except Category.DoesNotExist:
            return Response({'error': 'Category not found.'}, status=404)

        serializer = AdminCategorySerializer(category, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        return Response(AdminCategorySerializer(serializer.save()).data)

    def delete(self, request, pk):
        try:
            category = Category.objects.get(pk=pk)
        except Category.DoesNotExist:
            return Response({'error': 'Category not found.'}, status=404)

        # Category.products uses on_delete=PROTECT on the Product model.
        # Django will raise ProtectedError if products exist.
        # We catch it and return a helpful message instead of a 500 crash.
        from django.db.models import ProtectedError
        try:
            category.delete()
            return Response({'message': 'Category deleted.'}, status=200)
        except ProtectedError:
            return Response(
                {'error': 'Cannot delete a category that has products. '
                          'Move or delete the products first.'},
                status=status.HTTP_400_BAD_REQUEST
            )


# ── Orders ────────────────────────────────────────────────────────

class AdminOrderListView(APIView):
    """
    GET /api/admin/orders/
    Lists all orders with optional status filter and pagination.
    """
    permission_classes = [IsShopAdmin]

    def get(self, request):
        from checkout.models import Order

        queryset = Order.objects.prefetch_related('items__product').order_by('-created_at')
        # prefetch_related: fetches all related items in 1 extra query
        # instead of 1 query PER order (N+1 problem)
        # items__product: also pre-fetches the product on each item

        # Filter by status: ?status=pending
        order_status = request.query_params.get('status')
        if order_status:
            queryset = queryset.filter(status=order_status)

        # Search by customer email or name: ?q=jane
        q = request.query_params.get('q', '').strip()
        if q:
            queryset = queryset.filter(
                Q(email__icontains=q) | Q(full_name__icontains=q)
            )

        page = max(1, int(request.query_params.get('page', 1)))
        page_size = 25
        start = (page - 1) * page_size
        total = queryset.count()

        return Response({
            'orders': AdminOrderSerializer(
                queryset[start:start + page_size],
                many=True
            ).data,
            'pagination': {
                'page': page, 'total': total,
                'total_pages': max(1, -(-total // page_size)),
                'has_next': start + page_size < total,
                'has_previous': page > 1,
            }
        })


class AdminOrderDetailView(APIView):
    """
    GET   /api/admin/orders/<id>/    → full order detail
    PATCH /api/admin/orders/<id>/    → update status only
    """
    permission_classes = [IsShopAdmin]

    def get(self, request, pk):
        from checkout.models import Order
        try:
            order = Order.objects.prefetch_related('items__product').get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=404)
        return Response(AdminOrderSerializer(order).data)

    def patch(self, request, pk):
        """
        Change the order status.
        This triggers the post_save signal in notifications/signals.py
        which automatically sends the customer a notification.
        """
        from checkout.models import Order
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=404)

        new_status = request.data.get('status')
        valid_statuses = [s[0] for s in Order.STATUS_CHOICES]
        # STATUS_CHOICES = [('pending','Pending'), ('paid','Paid'), ...]
        # We extract just the keys: ['pending', 'paid', 'shipped', ...]

        if new_status not in valid_statuses:
            return Response(
                {'error': f"Invalid status. Choose from: {', '.join(valid_statuses)}"},
                status=400
            )

        order.status = new_status

        # Also mark is_paid when status set to 'paid'
        if new_status == 'paid' and not order.is_paid:
            from django.utils import timezone
            order.is_paid = True
            order.paid_at = timezone.now()
            order.save(update_fields=['status', 'is_paid', 'paid_at'])
        else:
            order.save(update_fields=['status'])
            # ↑ This triggers notifications/signals.py → customer gets notified

        return Response(AdminOrderSerializer(order).data)


# ── Low Stock ─────────────────────────────────────────────────────

class AdminLowStockView(APIView):
    """
    GET /api/admin/products/low-stock/
    Returns all products that are low or out of stock.
    """
    permission_classes = [IsShopAdmin]

    def get(self, request):
        low_stock = Product.objects.filter(
            is_active=True,
            stock__lte=django_models.F('low_stock_threshold')
        ).select_related('category').order_by('stock')

        return Response(
            AdminProductSerializer(low_stock, many=True, context={'request': request}).data
        )