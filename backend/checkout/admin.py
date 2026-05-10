from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product', 'quantity', 'price', 'subtotal']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'full_name', 'email', 'status', 'is_paid', 'total_amount', 'created_at']
    list_filter = ['status', 'is_paid', 'created_at']
    search_fields = ['full_name', 'email', 'id']
    readonly_fields = ['total_amount', 'created_at', 'updated_at', 'payment_intent_id']
    inlines = [OrderItemInline]
    actions = ['mark_as_paid']

    def mark_as_paid(self, request, queryset):
        queryset.update(is_paid=True)
    mark_as_paid.short_description = "Mark selected orders as paid"


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'product', 'quantity', 'price', 'subtotal']
    list_select_related = ['order', 'product']
    search_fields = ['order__id', 'product__name']