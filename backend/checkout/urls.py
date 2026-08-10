from django.urls import path

from .views import (
    CheckoutCreateAPIView,
    MpesaSTKPushAPIView,
    MpesaCallbackAPIView,
    OrderListAPIView,
    OrderDetailAPIView,
)


app_name = "checkout"


urlpatterns = [
    path(
        "",
        CheckoutCreateAPIView.as_view(),
        name="checkout-create",
    ),

    path(
        "mpesa/push/",
        MpesaSTKPushAPIView.as_view(),
        name="mpesa-push",
    ),

    path(
        "mpesa/callback/",
        MpesaCallbackAPIView.as_view(),
        name="mpesa-callback",
    ),

    path(
        "orders/",
        OrderListAPIView.as_view(),
        name="order-list",
    ),

    path(
        "orders/<int:order_id>/",
        OrderDetailAPIView.as_view(),
        name="order-detail",
    ),
]