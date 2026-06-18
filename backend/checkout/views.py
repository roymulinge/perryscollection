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
from . import mpesa
import logging

logger = logging.getLogger(__name__)
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
            phone_number=data.get('phone_number', ''),
            payment_method=data['payment_method'],
            address_line1=data['address_line1'],
            address_line2=data.get('address_line2', ''),
            city=data['city'],
            postal_code=data['postal_code'],
            country=data['country'],
            total_amount=cart.get_total_price()
        )

        # 5. Create order items and reduce stock
        for item in cart_items:
            product = locked_products[item['product'].id]
            OrderItem.objects.create(
                order=order, product=product,
                quantity=item['quantity'], price=item['price']
            )
            Product.objects.filter(id=product.id).update(stock=F('stock') - item['quantity'])

        cart.clear()

        return Response(
            OrderDetailSerializer(order).data,
            status=status.HTTP_201_CREATED
        )

class MpesaSTKPushAPIView(APIView):
    """
    POST /api/checkout/mpesa/push/
    Triggers the actual M-Pesa phone prompt for an already-created order.
    Frontend calls this immediately after CheckoutCreateAPIView succeeds,
    if the customer chose M-Pesa as payment method.

    Body: { "order_id": 42 }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        order_id = request.data.get('order_id')

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.payment_method != 'mpesa':
            return Response(
                {'error': 'This order is not set up for M-Pesa payment.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if order.is_paid:
            return Response(
                {'error': 'This order has already been paid.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            result = mpesa.trigger_stk_push(
                phone_number=order.phone_number,
                amount=order.total_amount,
                order_id=order.id,
                callback_url=mpesa.settings.MPESA_CALLBACK_URL,
            )
        except Exception as e:
            # Network failure, Safaricom downtime, bad credentials etc.
            # Log the FULL exception for your own debugging, but never
            # leak raw exception details to the frontend — that can
            # expose API keys or internal URLs in error messages
            logger.error(f"M-Pesa STK push failed for order {order.id}: {e}")
            return Response(
                {'error': 'Could not initiate M-Pesa payment. Please try again or choose Cash on Delivery.'},
                status=status.HTTP_502_BAD_GATEWAY
            )

        # ResponseCode "0" means Safaricom accepted the push request —
        # NOT that the customer has paid yet. That confirmation only
        # comes later via the callback.
        if result.get('ResponseCode') != '0':
            return Response(
                {'error': result.get('ResponseDescription', 'M-Pesa push failed.')},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Store Safaricom's tracking IDs so the callback can find this order
        order.mpesa_checkout_request_id = result.get('CheckoutRequestID', '')
        order.mpesa_merchant_request_id = result.get('MerchantRequestID', '')
        order.save(update_fields=['mpesa_checkout_request_id', 'mpesa_merchant_request_id'])

        return Response({
            'message': 'STK push sent. Check your phone to complete payment.',
            'checkout_request_id': order.mpesa_checkout_request_id,
        })


class MpesaCallbackAPIView(APIView):
    """
    POST /api/checkout/mpesa/callback/
    Safaricom calls THIS endpoint after the customer enters their PIN
    (or cancels/times out). No authentication — Safaricom's servers
    can't carry your JWT tokens. We verify the request by matching
    CheckoutRequestID against an order we created.

    CRITICAL LESSON FROM MACHAKOS UNITED FC:
    This URL must be registered with Safaricom INCLUDING the /api/
    prefix and trailing slash, exactly matching MPESA_CALLBACK_URL
    in your .env. Safaricom will silently fail to deliver callbacks
    to a mismatched URL — no error on your side, payments just never
    confirm and orders stay "pending" forever.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Log the raw payload always — when something goes wrong with
        # M-Pesa, this log is often your only way to debug it, since
        # Safaricom's sandbox dashboard doesn't show you much
        logger.info(f"M-Pesa callback received: {request.data}")

        try:
            # Safaricom's callback structure is deeply nested:
            # { "Body": { "stkCallback": { ... } } }
            callback_data = request.data['Body']['stkCallback']
            checkout_request_id = callback_data['CheckoutRequestID']
            result_code = callback_data['ResultCode']
        except (KeyError, TypeError):
            logger.error(f"Malformed M-Pesa callback payload: {request.data}")
            # We still return 200 — Safaricom will retry sending the
            # callback if we return an error status, which we don't want
            # for a malformed payload we can never parse correctly
            return Response({'ResultCode': 0, 'ResultDesc': 'Received'})

        try:
            order = Order.objects.get(mpesa_checkout_request_id=checkout_request_id)
        except Order.DoesNotExist:
            logger.error(f"No order found for CheckoutRequestID: {checkout_request_id}")
            return Response({'ResultCode': 0, 'ResultDesc': 'Received'})

        # ResultCode 0 = payment successful
        # Any other code = customer cancelled, entered wrong PIN, timed out etc.
        if result_code == 0:
            # CallbackMetadata contains the transaction details as a LIST
            # of {Name, Value} dicts — not a clean dict, annoyingly.
            # We need to search the list to find the receipt number.
            metadata_items = callback_data.get('CallbackMetadata', {}).get('Item', [])
            receipt_number = next(
                (item['Value'] for item in metadata_items if item.get('Name') == 'MpesaReceiptNumber'),
                ''
            )

            order.is_paid = True
            order.status = 'paid'
            order.paid_at = timezone.now()
            order.mpesa_receipt_number = receipt_number
            order.save()
            # order.save() triggers your existing notifications/signals.py
            # post_save signal → customer gets "Payment Confirmed" notification
            # automatically, no extra code needed here

            logger.info(f"Order {order.id} paid successfully. Receipt: {receipt_number}")
        else:
            # Payment failed/cancelled — order stays pending, customer
            # can retry payment or switch to Cash on Delivery
            result_desc = callback_data.get('ResultDesc', 'Payment failed')
            logger.warning(f"Order {order.id} payment failed: {result_desc}")

        # Always return this exact shape — it's what Safaricom expects
        # to acknowledge receipt of the callback. Anything else and
        # Safaricom may retry sending it repeatedly.
        return Response({'ResultCode': 0, 'ResultDesc': 'Received'})
        
        


class OrderListAPIView(APIView):
    """List orders (authenticated users only)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = Order.objects.filter(user=request.user)
        return Response(OrderListSerializer(orders, many=True).data)


class OrderDetailAPIView(APIView):
    """Retrieve a single order (authenticated user or admin)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
            # Allow only owner or admin
            if order.user != request.user and not request.user.is_staff:
                return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
            return Response(OrderDetailSerializer(order).data)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)