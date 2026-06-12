# notifications/models.py

from django.db import models
from django.conf import settings


class Notification(models.Model):
    """
    Represents a notification sent to a user.
    
    Design decisions:
    - We store a `notification_type` so the frontend can render different icons/styles
    - `is_read` lets users dismiss notifications
    - `target_url` is optional — clicking the notification can deep-link to the order
    - We use GenericForeignKey pattern via `object_id` so one model works for
      order notifications, product alerts, system messages etc.
    """

    # --- Notification types ---
    # These are the events that trigger a notification
    TYPE_CHOICES = [
        # Order lifecycle
        ('order_placed', 'Order Placed'),
        ('order_paid', 'Order Paid'),
        ('order_shipped', 'Order Shipped'),
        ('order_delivered', 'Order Delivered'),
        ('order_cancelled', 'Order Cancelled'),

        # Admin/shop messages
        ('admin_message', 'Admin Message'),

        # Inventory alerts (for admin users)
        ('low_stock', 'Low Stock Alert'),
        ('out_of_stock', 'Out of Stock Alert'),

        # General
        ('system', 'System Notification'),
    ]

    # --- Who receives this notification ---
    # ForeignKey to your CustomUser model
    # on_delete=CASCADE: if the user is deleted, their notifications go too
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'   # user.notifications.all()
    )

    # --- What kind of notification ---
    notification_type = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES,
        db_index=True   # we'll filter by type frequently
    )

    # --- The message content ---
    title = models.CharField(max_length=255)
    message = models.TextField()

    # --- Optional deep-link ---
    # e.g. '/api/checkout/orders/42/' so the frontend can navigate on click
    target_url = models.CharField(max_length=500, blank=True, default='')

    # --- Read state ---
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    # --- Timestamps ---
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']   # newest first
        indexes = [
            # Most common query: "give me all unread notifications for user X"
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['recipient', '-created_at']),
        ]

    def __str__(self):
        return f"[{self.notification_type}] → {self.recipient.email}: {self.title}"

    @classmethod
    def create_for_user(cls, recipient, notification_type, title, message, target_url=''):
        """
        Convenience factory method — call this from signals or views.
        
        Usage:
            Notification.create_for_user(
                recipient=user,
                notification_type='order_placed',
                title='Order #42 confirmed',
                message='Your order has been placed successfully.',
                target_url='/api/checkout/orders/42/'
            )
        """
        return cls.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            title=title,
            message=message,
            target_url=target_url
        )