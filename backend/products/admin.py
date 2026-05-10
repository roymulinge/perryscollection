from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at', 'updated_at', 'view_products_link']
    search_fields = ['name', 'slug']          
    prepopulated_fields = {'slug': ('name',)} 
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['name']
    list_per_page = 50

    def view_products_link(self, obj):
        count = obj.products.count()
        url = reverse('admin:products_product_changelist') + f'?category__id__exact={obj.id}'
        return format_html('<a href="{}">{} product(s)</a>', url, count)
    view_products_link.short_description = 'Products'


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['sku', 'name', 'category', 'price', 'stock', 'available', 'featured', 'in_stock_badge', 'image_preview']
    list_display_links = ['sku', 'name']
    list_editable = ['price', 'stock', 'available', 'featured']
    list_filter = ['category', 'available', 'featured', 'is_active', 'created_at', 'updated_at']
    search_fields = ['sku', 'name', 'description']
    list_per_page = 50
    date_hierarchy = 'created_at'
    ordering = ['-created_at']

    fieldsets = (
        ('Core Information', {'fields': ('sku', 'name', 'slug', 'category')}),
        ('Pricing', {'fields': ('price', 'compare_at_price'), 'classes': ('wide',)}),
        ('Inventory', {'fields': ('stock', 'low_stock_threshold', 'available', 'is_active')}),
        ('Media', {'fields': ('image',)}),
        ('Flags', {'fields': ('featured',), 'classes': ('collapse',)}),
        ('Content', {'fields': ('description',), 'classes': ('wide',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )
    readonly_fields = ['created_at', 'updated_at']
    prepopulated_fields = {'slug': ('name',)}   
    autocomplete_fields = ['category']           

    def in_stock_badge(self, obj):
        return obj.in_stock
    in_stock_badge.boolean = True
    in_stock_badge.short_description = 'In Stock?'

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-height: 50px; max-width: 50px;" />', obj.image.url)
        return "No image"
    image_preview.short_description = 'Preview'

    actions = ['make_available', 'make_unavailable', 'add_stock_10']

    def make_available(self, request, queryset):
        updated = queryset.update(available=True)
        self.message_user(request, f'{updated} product(s) marked as available.')
    make_available.short_description = 'Mark selected products as available'

    def make_unavailable(self, request, queryset):
        updated = queryset.update(available=False)
        self.message_user(request, f'{updated} product(s) marked as unavailable.')
    make_unavailable.short_description = 'Mark selected products as unavailable'

    def add_stock_10(self, request, queryset):
        for product in queryset:
            product.stock += 10
            product.save()
        self.message_user(request, f'Added 10 stock to {queryset.count()} product(s).')
    add_stock_10.short_description = 'Add 10 to stock'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('category')