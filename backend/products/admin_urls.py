# products/admin_urls.py
# All admin API URLs in one place.

from django.urls import path
from . import admin_views

# No app_name here — registered under /api/admin/ in main urls.py

urlpatterns = [
    # Dashboard
    path('dashboard/', admin_views.AdminDashboardView.as_view(), name='admin-dashboard'),

    # Products
    path('products/', admin_views.AdminProductListView.as_view(), name='admin-products'),
    path('products/low-stock/', admin_views.AdminLowStockView.as_view(), name='admin-low-stock'),
    path('products/<int:pk>/', admin_views.AdminProductDetailView.as_view(), name='admin-product-detail'),

    # Categories
    path('categories/', admin_views.AdminCategoryListView.as_view(), name='admin-categories'),
    path('categories/<int:pk>/', admin_views.AdminCategoryDetailView.as_view(), name='admin-category-detail'),

    # Orders
    path('orders/', admin_views.AdminOrderListView.as_view(), name='admin-orders'),
    path('orders/<int:pk>/', admin_views.AdminOrderDetailView.as_view(), name='admin-order-detail'),
]