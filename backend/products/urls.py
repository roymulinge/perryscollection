from django.urls import path
from . import views

app_name = 'products'

urlpatterns = [
    path('', views.HomeAPIView.as_view(), name='home'),
    path('products/', views.ProductListAPIView.as_view(), name='product_list'),
    path('products/<slug:slug>/', views.ProductDetailAPIView.as_view(), name='product_detail'),
    path('categories/', views.CategoryListAPIView.as_view(), name='category_list'),
    path('categories/<slug:slug>/', views.CategoryDetailAPIView.as_view(), name='category_detail'),
]