# checkout/admin.py

from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Order, OrderItem
from notifications.models import Notification


class OrderItemInline(admin.TabularInline):
    """
    Inline means OrderItems appear inside the Order admin page —
    you see the full order and its items on one screen.
    TabularInline = compact table layout (vs StackedInline = verbose form).
    """
    model = OrderItem
    extra = 0          # don't show empty extra rows
    readonly_fields = ['product', 'quantity', 'price', 'subtotal']
    can_delete = False  # don't allow deleting individual items from admin


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """
    Full order management panel.
    Admin can:
    - View all orders with status, payment, totals
    - Change order status (triggers notification to customer via signal)
    - Search by customer name, email, order ID
    - Filter by status and payment
    """

    inlines = [OrderItemInline]  # show items inside order page

    list_display = [
        'id',
        'full_name',
        'email',
        'status_badge',      # colored badge
        'total_amount',
        'is_paid',
        'created_at',
    ]

    list_filter = ['status', 'is_paid', 'created_at']

    search_fields = ['email', 'full_name', 'id']

    readonly_fields = ['created_at', 'updated_at', 'total_amount', 'paid_at']

    ordering = ['-created_at']

    list_per_page = 30

    # Fields shown when editing an order
    # We group them into fieldsets for clarity
    fieldsets = [
        ('Order Info', {
            'fields': ['status', 'is_paid', 'paid_at', 'total_amount', 'payment_intent_id']
        }),
        ('Customer', {
            'fields': ['user', 'full_name', 'email']
        }),
        ('Shipping Address', {
            'fields': ['address_line1', 'address_line2', 'city', 'postal_code', 'country']
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']  # collapsed by default — less clutter
        }),
    ]

    # Bulk actions for order management
    actions = ['mark_as_paid', 'mark_as_shipped', 'mark_as_delivered', 'mark_as_cancelled']

    def status_badge(self, obj):
        """Color-coded status badges for quick scanning."""
        colors = {
            'pending':   '#f59e0b',   # amber
            'paid':      '#3b82f6',   # blue
            'shipped':   '#8b5cf6',   # purple
            'delivered': '#10b981',   # green
            'cancelled': '#ef4444',   # red
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background:{}; color:white; padding:2px 8px; '
            'border-radius:4px; font-size:12px;">{}</span>',
            color,
            obj.get_status_display()  # get_status_display() returns the human label e.g. 'Paid'
        )
    status_badge.short_description = 'Status'

    def _update_status_and_notify(self, request, queryset, new_status, success_msg):
        """
        Private helper used by bulk actions below.
        Updates status — which triggers the post_save signal — which sends
        the notification to the customer automatically.
        """
        updated = 0
        for order in queryset:
            order.status = new_status
            order.save()  # ← this triggers notifications/signals.py
            updated += 1
        self.message_user(request, f'{updated} order(s) {success_msg}.')

    @admin.action(description='Mark selected orders as Paid')
    def mark_as_paid(self, request, queryset):
        queryset.update(is_paid=True, paid_at=timezone.now())
        self._update_status_and_notify(request, queryset, 'paid', 'marked as paid')

    @admin.action(description='Mark selected orders as Shipped')
    def mark_as_shipped(self, request, queryset):
        self._update_status_and_notify(request, queryset, 'shipped', 'marked as shipped')

    @admin.action(description='Mark selected orders as Delivered')
    def mark_as_delivered(self, request, queryset):
        self._update_status_and_notify(request, queryset, 'delivered', 'marked as delivered')

    @admin.action(description='Mark selected orders as Cancelled')
    def mark_as_cancelled(self, request, queryset):
        self._update_status_and_notify(request, queryset, 'cancelled', 'marked as cancelled')


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    """Standalone view for order items if needed."""
    list_display = ['id', 'order', 'product', 'quantity', 'price', 'subtotal']
    list_filter = ['order__status']
    search_fields = ['product__name', 'order__email']
    readonly_fields = ['subtotal']