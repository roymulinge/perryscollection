from django.urls import path
from . import views

app_name = 'products'

urlpatterns = [
    path('', views.HomeAPIView.as_view(), name='home'),
    path('api/products/', views.ProductListAPIView.as_view(), name='product_list'),
    path('api/products/<slug:slug>/', views.ProductDetailAPIView.as_view(), name='product_detail'),
    path('api/categories/', views.CategoryListAPIView.as_view(), name='category_list'),
    path('api/categories/<slug:slug>/', views.CategoryDetailAPIView.as_view(), name='category_detail'),
]