from django.urls import path
from . import views

app_name = 'shopping-cart'

urlpatterns = [
    path('', views.CartAPIView.as_view(), name='cart-detail'),
    path('add/', views.CartAddAPIView.as_view(), name='cart-add'),
    path('update/<int:product_id>/', views.CartUpdateAPIView.as_view(), name='cart-update'),
    path('remove/<int:product_id>/', views.CartRemoveAPIView.as_view(), name='cart-remove'),
]