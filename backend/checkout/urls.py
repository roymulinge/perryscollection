# checkout/urls.py

from django.urls import path
from . import views

# 'checkout' is the namespace — register this in your main urls.py
app_name = 'checkout'

urlpatterns = [
    # POST /api/checkout/       → create an order from the current cart
    path('', views.CheckoutCreateAPIView.as_view(), name='checkout'),

    # GET /api/checkout/orders/          → list my orders (authenticated)
    path('orders/', views.OrderListAPIView.as_view(), name='order-list'),

    # GET /api/checkout/orders/<id>/     → single order detail
    path('orders/<int:order_id>/', views.OrderDetailAPIView.as_view(), name='order-detail'),

    # ── M-Pesa endpoints ──
    path('mpesa/push/', views.MpesaSTKPushAPIView.as_view(), name='mpesa-push'),
    # NOTE: this exact path 'mpesa/callback/' is what your full
    # MPESA_CALLBACK_URL must end with — confirmed against the
    # /api/checkout/ prefix already registered in perrys_backend/urls.py
    path('mpesa/callback/', views.MpesaCallbackAPIView.as_view(), name='mpesa-callback'),
]