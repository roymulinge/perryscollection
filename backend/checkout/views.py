import logging

from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny

from shopping_cart.services import CartService

from .models import Order
from .serializers import (
    CheckoutSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
)
from .services import CheckoutService
from . import mpesa
from django.conf import settings

logger = logging.getLogger(__name__)

User = get_user_model()


def get_session_id(request):
    """
    Return the current Django session ID.

    Guest checkout requires a session.
    """

    if not request.session.session_key:
        request.session.create()

    return request.session.session_key


def get_cart_for_checkout(request):
    """
    Resolve the cart belonging to this request.

    Authenticated user:
        Get or create the user's active cart.

    Guest:
        Get or create the guest cart using the Django session.
    """

    if request.user.is_authenticated:
        return CartService.get_or_create_cart(
            user=request.user,
        )

    session_id = get_session_id(request)

    return CartService.get_or_create_cart(
        session_id=session_id,
    )


class CheckoutCreateAPIView(APIView):
    """
    POST /api/checkout/

    Create an order from the current cart.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CheckoutSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        cart = get_cart_for_checkout(request)

        order = CheckoutService.create_order(
            cart=cart,
            checkout_data=serializer.validated_data,
             
        )

        return Response(
            OrderDetailSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


class MpesaSTKPushAPIView(APIView):
    """
    POST /api/checkout/mpesa/push/

    Trigger an M-Pesa STK push for an existing order.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        order_id = request.data.get("order_id")

        if not order_id:
            return Response(
                {"error": "order_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order = Order.objects.get(
                id=order_id
            )
        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if order.payment_method != "mpesa":
            return Response(
                {
                    "error":
                    "This order is not configured for M-Pesa."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.is_paid:
            return Response(
                {"error": "This order has already been paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not order.phone_number:
            return Response(
                {
                    "error":
                    "A phone number is required for M-Pesa."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = mpesa.trigger_stk_push(
                phone_number=order.phone_number,
                amount=order.total_amount,
                order_id=order.id,
                callback_url=settings.MPESA_CALLBACK_URL,
            )

        except Exception as exc:
            logger.error(
                "M-Pesa STK push failed for order %s: %s",
                order.id,
                exc,
            )

            return Response(
                {
                    "error":
                    "Could not initiate M-Pesa payment."
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if result.get("ResponseCode") != "0":
            return Response(
                {
                    "error": result.get(
                        "ResponseDescription",
                        "M-Pesa push failed.",
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.mpesa_checkout_request_id = (
            result.get("CheckoutRequestID", "")
        )

        order.mpesa_merchant_request_id = (
            result.get("MerchantRequestID", "")
        )

        order.save(
            update_fields=[
                "mpesa_checkout_request_id",
                "mpesa_merchant_request_id",
            ]
        )

        return Response(
            {
                "message":
                    "STK push sent. Check your phone to complete payment.",
                "checkout_request_id":
                    order.mpesa_checkout_request_id,
            },
            status=status.HTTP_200_OK,
        )


class MpesaCallbackAPIView(APIView):
    """
    POST /api/checkout/mpesa/callback/

    Safaricom callback endpoint.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        logger.info(
            "M-Pesa callback received: %s",
            request.data,
        )

        try:
            callback_data = (
                request.data["Body"]["stkCallback"]
            )

            checkout_request_id = (
                callback_data["CheckoutRequestID"]
            )

            result_code = callback_data["ResultCode"]

        except (KeyError, TypeError):
            logger.error(
                "Malformed M-Pesa callback: %s",
                request.data,
            )

            return Response(
                {
                    "ResultCode": 0,
                    "ResultDesc": "Received",
                }
            )

        try:
            order = Order.objects.get(
                mpesa_checkout_request_id=
                checkout_request_id
            )

        except Order.DoesNotExist:
            logger.error(
                "No order found for CheckoutRequestID: %s",
                checkout_request_id,
            )

            return Response(
                {
                    "ResultCode": 0,
                    "ResultDesc": "Received",
                }
            )

        if result_code == 0:
            metadata_items = (
                callback_data
                .get("CallbackMetadata", {})
                .get("Item", [])
            )

            receipt_number = next(
                (
                    item.get("Value")
                    for item in metadata_items
                    if item.get("Name")
                    == "MpesaReceiptNumber"
                ),
                "",
            )

            order.is_paid = True
            order.status = "paid"
            order.paid_at = timezone.now()
            order.mpesa_receipt_number = receipt_number

            order.save(
                update_fields=[
                    "is_paid",
                    "status",
                    "paid_at",
                    "mpesa_receipt_number",
                ]
            )

            logger.info(
                "Order %s paid successfully.",
                order.id,
            )

        else:
            result_desc = callback_data.get(
                "ResultDesc",
                "Payment failed.",
            )

            logger.warning(
                "M-Pesa payment failed for order %s: %s",
                order.id,
                result_desc,
            )

        return Response(
            {
                "ResultCode": 0,
                "ResultDesc": "Received",
            }
        )


class OrderListAPIView(APIView):
    """
    GET /api/orders/

    Authenticated users can see their own orders.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = (
            Order.objects
            .filter(user=request.user)
            .prefetch_related("items")
        )

        serializer = OrderListSerializer(
            orders,
            many=True,
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


class OrderDetailAPIView(APIView):
    """
    GET /api/orders/<order_id>/

    Users can only access their own orders.
    Staff can access any order.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        try:
            order = (
                Order.objects
                .prefetch_related(
                    "items__product"
                )
                .get(id=order_id)
            )

        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if (
            order.user != request.user
            and not request.user.is_staff
        ):
            return Response(
                {"error": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = OrderDetailSerializer(
            order
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )