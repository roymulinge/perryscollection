from django.views.generic import ListView, DetailView
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from .models import Product, Category
from django.db import models

class HomeView(ListView):
    """
    Homepage – shows featured products and all categories.
    """
    model = Product
    template_name = 'products/home.html'
    context_object_name = 'featured_products'
    paginate_by = 12   # if you want pagination on home

    def get_queryset(self):
        # Only show products that are available, active, and featured
        return Product.objects.filter(
            available=True,
            is_active=True,
            featured=True
        ).select_related('category').order_by('-created_at')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Add all categories for navigation (cached for 1 hour)
        categories = cache.get('all_categories')
        if not categories:
            categories = Category.objects.all()
            cache.set('all_categories', categories, 3600)
        context['categories'] = categories
        return context


class CategoryListView(ListView):
    """
    List all active categories.
    """
    model = Category
    template_name = 'products/category_list.html'
    context_object_name = 'categories'

    def get_queryset(self):
        return Category.objects.all().order_by('name')


class CategoryDetailView(DetailView):
    """
    Show all products in a given category (available + active).
    Paginated.
    """
    model = Category
    template_name = 'products/category_detail.html'
    context_object_name = 'category'
    slug_url_kwarg = 'slug'

    def get_queryset(self):
        return Category.objects.prefetch_related('products')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # Get paginated products for this category
        products = self.object.products.filter(
            available=True,
            is_active=True
        ).order_by('-created_at')
        
        paginator = self.get_paginator(products, 20)
        page_number = self.request.GET.get('page')
        page_obj = paginator.get_page(page_number)
        
        context['products'] = page_obj
        context['page_obj'] = page_obj
        context['paginator'] = paginator
        return context

    def get_paginator(self, queryset, per_page):
        from django.core.paginator import Paginator
        return Paginator(queryset, per_page)


class ProductListView(ListView):
    """
    List all available products with optional filtering:
    - ?featured=true   (only featured)
    - ?q=search term   (search in name, sku, description)
    """
    model = Product
    template_name = 'products/product_list.html'
    context_object_name = 'products'
    paginate_by = 24
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Product.objects.filter(
            available=True,
            is_active=True
        ).select_related('category')

        # Filter by featured if requested
        featured_filter = self.request.GET.get('featured')
        if featured_filter == 'true':
            queryset = queryset.filter(featured=True)

        # Search functionality
        search_term = self.request.GET.get('q')
        if search_term:
            queryset = queryset.filter(
                models.Q(name__icontains=search_term) |
                models.Q(sku__icontains=search_term) |
                models.Q(description__icontains=search_term)
            )

        return queryset.order_by('-created_at')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['search_term'] = self.request.GET.get('q', '')
        context['featured_filter'] = self.request.GET.get('featured', '')
        return context


class ProductDetailView(DetailView):
    """
    Individual product page – only shown if available and active.
    Uses caching for 15 minutes.
    """
    model = Product
    template_name = 'products/product_detail.html'
    context_object_name = 'product'
    slug_url_kwarg = 'slug'

    def get_queryset(self):
        # Public view: only show products that are available and active
        return Product.objects.filter(
            available=True,
            is_active=True
        ).select_related('category')

    @method_decorator(cache_page(60 * 15))  # 15 minutes cache
    @method_decorator(vary_on_headers('Cookie'))  # vary on cookie (for cart)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # You can add related products, SEO meta, etc.
        # Example: related products from same category (exclude current)
        context['related_products'] = Product.objects.filter(
            category=self.object.category,
            available=True,
            is_active=True
        ).exclude(id=self.object.id)[:4]
        return context