from django.contrib import admin
from .models import Category, Product
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.http import HttpResponseRedirect

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    
    list_display = ['slug', 'name', 'created_at', 'updated_at', 'view_products_link']
    search_fileds = ['name', 'slug']
    prepopulated_fields = {'slug': ('name')}
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['name']
    list_per_page = 50

    def view_products_link(self, obj):

        count = obj.products.count()
        url = reverse('admin:products_product_changelist') + f'?category_id_exact={obj.id}'
        return format_html('<a href="{}">{} product(s)</a>', url, count)
    view_products_link.short_description = 'Products'

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):

    list_display = [
        'sku', 'name', 'category', 'price', 'stock',
        'available', 'featured', 'in_stock_badge', 'image_preview'
    ]
    list_display_links = ['sku', 'name']
    list_editable = ['price', 'stock', 'available', 'featured']
    list_filter = [
        'category', 'available', 'featured', 'is_active',
        'created_at', 'updated_at'
    ]
    search_fields = ['sku', 'name', 'description']
    list_per_page = 50
    date_hierarchy = 'created_at'
    ordering = ['-created_at']

      # ---------- Detail form (add/edit) ----------
    fieldsets = (
        ('Core Information', {
            'fields': ('sku', 'name', 'slug', 'category')
        }),
        ('Pricing', {
            'fields': ('price', 'compare_at_price'),
            'classes': ('wide',)
        }),
        ('Inventory', {
            'fields': ('stock', 'low_stock_threshold', 'available', 'is_active'),
            'description': 'Set stock to 0 and uncheck "available" for out-of-stock products.'
        }),
        ('Media', {
            'fields': ('image',),
            'description': 'Image will be automatically resized to 1200x1200 and converted to JPEG.'
        }),
        ('Flags', {
            'fields': ('featured',),
            'classes': ('collapse',)
        }),
        ('Content', {
            'fields': ('description',),
            'classes': ('wide',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']
    prepopulated_fields = {'slug': ('name',)}
    autocomplete_fields = ['category']


    prepopulated_fields = ['']
    readonly_fileds = ['created_at', 'updated_at']

    def save_model(self, request,obj, form, change):

        super().save_model(request, obj, form, change)

    @admin.display(boolean=True, description='In Stock?')
    def in_stock_badge(self, obj):
        """
        Show a green/red badge in list view based on stock & available.
        """
        return obj.in_stock
    
    @admin.display(description='Image Preview')
    def image_preview(self, obj):
        """
        Show a thumbnail of the product image in the list view.
        """
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height: 50px; max-width: 50px;" />',
                obj.image.url
            )
        return mark_safe('<span style="color: gray;">No image</span>')
  
    actions = ['make_available', 'make_unavailable', 'add_stock_10']

    @admin.action(description='Mark selected products as available')
    def make_available(self, request, queryset):
        updated = queryset.update(available=True)
        self.message_user(request, f'{updated} product(s) marked as available.')

    @admin.action(description='Mark selected products as unavailable')
    def make_unavailable(self, request, queryset):
        updated = queryset.update(available=False)
        self.message_user(request, f'{updated} product(s) marked as unavailable.')

    @admin.action(description='Add 10 to stock (up to 9999)')
    def add_stock_10(self, request, queryset):
        for product in queryset:
            product.stock += 10
            product.save()   # triggers full_clean() and Pillow resave (but no image change)
        self.message_user(request, f'Added 10 stock to {queryset.count()} product(s).')

    # ---------- Override get_queryset to optimize ----------
    def get_queryset(self, request):
        """
        Prefetch related category to avoid N+1 queries in list view.
        """
        return super().get_queryset(request).select_related('category')
    

        


