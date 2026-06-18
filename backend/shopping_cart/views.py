# shopping_cart/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .utils import Cart
from .serializers import (
    CartSerializer, AddToCartSerializer,
    UpdateCartSerializer, CartItemProductSerializer
)
from products.models import Product


class CartAPIView(APIView):
    """Get, clear cart."""
    permission_classes = [AllowAny]

    def get(self, request):
        cart = Cart(request)
        items = list(cart)
        serializer = CartSerializer(
            {
                'items': items,
                'total_items': len(cart),
                'total_price': cart.get_total_price()
            },
            # ── FIX: pass request context so nested image_url builds correctly ──
            # Without this, CartItemProductSerializer.get_image_url() has no
            # request to call build_absolute_uri() on, and silently returns
            # a relative path or None depending on Cloudinary's url format.
            context={'request': request}
        )
        return Response(serializer.data)

    def delete(self, request):
        cart = Cart(request)
        cart.clear()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartAddAPIView(APIView):
    """Add product to cart."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AddToCartSerializer(data=request.data)
        if serializer.is_valid():
            product = serializer.validated_data['product_id']
            quantity = serializer.validated_data['quantity']
            override = serializer.validated_data['override']
            cart = Cart(request)
            try:
                cart.add(product, quantity, override)
                return Response({'message': 'Product added to cart'}, status=status.HTTP_200_OK)
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CartUpdateAPIView(APIView):
    """Update quantity of a specific product."""
    permission_classes = [AllowAny]

    def post(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id, available=True, is_active=True)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateCartSerializer(data=request.data)
        if serializer.is_valid():
            quantity = serializer.validated_data['quantity']
            cart = Cart(request)
            try:
                cart.update_quantity(product, quantity)
                return Response({'message': 'Cart updated'}, status=status.HTTP_200_OK)
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CartRemoveAPIView(APIView):
    """Remove a product from cart."""
    permission_classes = [AllowAny]

    def delete(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        cart = Cart(request)
        cart.remove(product)
        return Response(status=status.HTTP_204_NO_CONTENT)