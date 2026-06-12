# notifications/admin.py

from django.contrib import admin
from django.utils.html import format_html
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """
    Admin panel for managing notifications.
    Admins can:
    - See all notifications across all users
    - Filter by type, read status, date
    - Send manual notifications to users
    - Bulk mark-as-read or delete
    """

    # Columns shown in the list view
    list_display = [
        'id',
        'recipient_email',       # custom method below
        'notification_type',
        'title',
        'is_read_badge',         # custom colored badge
        'created_at',
    ]

    # Sidebar filters
    list_filter = [
        'notification_type',
        'is_read',
        'created_at',
    ]

    # Search box — searches across these fields
    search_fields = [
        'recipient__email',
        'title',
        'message',
    ]

    # Fields that can't be edited in admin
    readonly_fields = ['created_at', 'read_at']

    # Default ordering — newest first
    ordering = ['-created_at']

    # How many per page in the admin list
    list_per_page = 50

    # Bulk actions available from the checkbox menu
    actions = ['mark_all_read', 'mark_all_unread']

    def recipient_email(self, obj):
        """Display the recipient's email in the list view."""
        return obj.recipient.email
    recipient_email.short_description = 'Recipient'  # column header
    recipient_email.admin_order_field = 'recipient__email'  # make it sortable

    def is_read_badge(self, obj):
        """
        Render a colored badge instead of plain True/False.
        format_html() is Django's safe way to output HTML in admin —
        it escapes values to prevent XSS attacks.
        """
        if obj.is_read:
            return format_html(
                '<span style="color: green; font-weight: bold;">✓ Read</span>'
            )
        return format_html(
            '<span style="color: red; font-weight: bold;">● Unread</span>'
        )
    is_read_badge.short_description = 'Status'

    @admin.action(description='Mark selected notifications as read')
    def mark_all_read(self, request, queryset):
        """
        Custom bulk action — select multiple notifications and mark read.
        queryset is the set of selected Notification objects.
        """
        from django.utils import timezone
        updated = queryset.update(is_read=True, read_at=timezone.now())
        # self.message_user() shows a success banner at the top of the page
        self.message_user(request, f'{updated} notification(s) marked as read.')

    @admin.action(description='Mark selected notifications as unread')
    def mark_all_unread(self, request, queryset):
        updated = queryset.update(is_read=False, read_at=None)
        self.message_user(request, f'{updated} notification(s) marked as unread.')