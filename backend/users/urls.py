# users/urls.py

from django.urls import path
from . import views

# No app_name here — we register these under /api/auth/ in main urls.py

urlpatterns = [
    # POST /api/auth/register/   → create account + get tokens
    path('register/', views.RegisterAPIView.as_view(), name='register'),

    # POST /api/auth/login/      → get tokens
    path('login/', views.LoginAPIView.as_view(), name='login'),

    # GET  /api/auth/me/         → get my profile (requires token)
    path('me/', views.MeAPIView.as_view(), name='me'),
    path('profile/', views.ProfileAPIView.as_view(), name='profile'),
]