# notifications/signals.py

from django.db.models.signals import post_save   # fires AFTER a model is saved
from django.dispatch import receiver              # decorator that connects a function to a signal
from checkout.models import Order                 # the model we're watching
from .models import Notification


@receiver(post_save, sender=Order)
def notify_on_order_status_change(sender, instance, created, **kwargs):
    """
    Fires every time an Order is saved.
    
    Parameters:
    - sender:   the model class that sent the signal (Order)
    - instance: the actual Order object that was just saved
    - created:  True if this is a brand-new order, False if it's an update
    - **kwargs: extra data Django passes (we don't use it here)
    """

    # Only send notifications if there's a logged-in user on the order
    # Anonymous checkouts have no user, so we skip them
    if not instance.user:
        return

    if created:
        # Brand new order was just placed
        Notification.create_for_user(
            recipient=instance.user,
            notification_type='order_placed',
            title=f'Order #{instance.id} Confirmed',
            message=(
                f'Hi {instance.full_name}, your order has been placed successfully. '
                f'Total: ${instance.total_amount}.'
            ),
            target_url=f'/api/checkout/orders/{instance.id}/'
        )
        return  # stop here — no need to check status on new order

    # For updates, check what status changed to
    # We only care about specific transitions
    status_map = {
        # status value → (notification_type, title_template, message_template)
        'paid': (
            'order_paid',
            f'Payment Confirmed — Order #{instance.id}',
            f'We\'ve received your payment of ${instance.total_amount}. Your order is being prepared.'
        ),
        'shipped': (
            'order_shipped',
            f'Order #{instance.id} Has Shipped!',
            f'Great news — your order is on its way. Check your email for tracking details.'
        ),
        'delivered': (
            'order_delivered',
            f'Order #{instance.id} Delivered',
            f'Your order has been delivered. We hope you enjoy your purchase!'
        ),
        'cancelled': (
            'order_cancelled',
            f'Order #{instance.id} Cancelled',
            f'Your order has been cancelled. Contact support if this was unexpected.'
        ),
    }

    # Look up whether this status has a notification
    notification_data = status_map.get(instance.status)
    if notification_data:
        notif_type, title, message = notification_data
        Notification.create_for_user(
            recipient=instance.user,
            notification_type=notif_type,
            title=title,
            message=message,
            target_url=f'/api/checkout/orders/{instance.id}/'
        )