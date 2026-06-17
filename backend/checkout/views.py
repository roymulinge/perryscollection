from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import F
from django.db import transaction
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from products.models import Product
from shopping_cart.utils import Cart
from .models import Order, OrderItem
from .serializers import CheckoutSerializer, OrderDetailSerializer, OrderListSerializer

User = get_user_model()


class CheckoutCreateAPIView(APIView):
    """
    Create order from current cart.
    Requires cart data in session.
    Access: AllowAny (anonymous checkout) or IsAuthenticated.
    """
    permission_classes = [AllowAny]  # change to IsAuthenticated if needed

    @transaction.atomic
    def post(self, request):
        # 1. Validate checkout data
        serializer = CheckoutSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data

        # 2. Get cart from session
        cart = Cart(request)
        if len(cart) == 0:
            return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Verify stock for all items (prevent race condition)
        cart_items = list(cart)

        product_ids = [item['product'].id for item in cart_items]
        locked_products = {
            p.id: p for p in Product.objects.select_for_update().filter(id__in=product_ids)
        }
        for item in cart_items:
            product = locked_products.get(item['product'].id)

            if not product or not product.is_active or not product.available:
                return Response(
                    {'error': f'"{item["product"].name}" is no longer available.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if item['quantity'] > product.stock:
                return Response({
                    'error': f'Not enough stock for {product.name}. Only {product.stock} left.'
                }, status=status.HTTP_400_BAD_REQUEST)

        # 4. Create order
        order = Order.objects.create(
            user=request.user if request.user.is_authenticated else None,
            email=data['email'],
            full_name=data['full_name'],
            address_line1=data['address_line1'],
            address_line2=data.get('address_line2', ''),
            city=data['city'],
            postal_code=data['postal_code'],
            country=data['country'],
            total_amount=cart.get_total_price()
        )

        # 5. Create order items and reduce stock
        for item in cart_items:
            product = item['product']
            quantity = item['quantity']
            price = item['price']
            
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=quantity,
                price=price
            )
            # Reduce stock
            Product.objects.filter(id=product.id).update(stock=F('stock') - quantity)

        # 6. Clear cart
        cart.clear()

        # 7. Return order details
        order_serializer = OrderDetailSerializer(order)
        return Response(order_serializer.data, status=status.HTTP_201_CREATED)


class OrderListAPIView(APIView):
    """List orders (authenticated users only)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(user=request.user)
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)


class OrderDetailAPIView(APIView):
    """Retrieve a single order (authenticated user or admin)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            # Allow only owner or admin
            if order.user != request.user and not request.user.is_staff:
                return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
            serializer = OrderDetailSerializer(order)
            return Response(serializer.data)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)