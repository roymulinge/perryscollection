# perrys_backend/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
# TokenRefreshView is built into simplejwt — takes a refresh token, returns a new access token

urlpatterns = [
    path('admin/', admin.site.urls),

    # Legacy allauth (keep for now, can remove later)
    path('users/', include('users.urls')),
    path('accounts/', include('allauth.urls')),

    # ── API routes ──
    path('', include('products.urls', namespace='products')),
    path('api/auth/', include('users.urls')),
    # ↑ React calls /api/auth/login/, /api/auth/register/, /api/auth/me/

    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # ↑ React calls this when access token expires to get a new one

    path('api/shopping_cart/', include('shopping_cart.urls', namespace='shopping_cart')),
    path('api/checkout/', include('checkout.urls', namespace='checkout')),
    path('api/notifications/', include('notifications.urls', namespace='notifications')),
    path('api/inventory-agent/', include('inventory_agent.urls')),
]