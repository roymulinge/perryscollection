from django.db.models.signals import post_save
from django.dispatch import receiver

from checkout.models import Order
from .models import Notification


@receiver(post_save, sender=Order)
def notify_on_order_status_change(
    sender,
    instance,
    created,
    **kwargs,
):
    """
    Create user notifications for order lifecycle events.
    """

    # Anonymous orders have no recipient.
    if not instance.user:
        return

    # ---------------------------------------------------------
    # NEW ORDER
    # ---------------------------------------------------------

    if created:
        Notification.create_for_user(
            recipient=instance.user,
            notification_type="order_placed",
            title=f"Order #{instance.id} Confirmed",
            message=(
                f"Hi {instance.full_name}, "
                f"your order has been placed successfully. "
                f"Total: ${instance.total_amount}."
            ),
            target_url=(
                f"/api/checkout/orders/{instance.id}/"
            ),
        )

        return

    # ---------------------------------------------------------
    # ORDER STATUS CHANGES
    # ---------------------------------------------------------

    status_map = {
        "paid": (
            "order_paid",
            f"Payment Confirmed — Order #{instance.id}",
            (
                f"We've received your payment of "
                f"${instance.total_amount}. "
                "Your order is being prepared."
            ),
        ),
        "shipped": (
            "order_shipped",
            f"Order #{instance.id} Has Shipped!",
            (
                "Great news — your order is on its way. "
                "Check your email for tracking details."
            ),
        ),
        "delivered": (
            "order_delivered",
            f"Order #{instance.id} Delivered",
            (
                "Your order has been delivered. "
                "We hope you enjoy your purchase!"
            ),
        ),
        "cancelled": (
            "order_cancelled",
            f"Order #{instance.id} Cancelled",
            (
                "Your order has been cancelled. "
                "Contact support if this was unexpected."
            ),
        ),
    }

    notification_data = status_map.get(instance.status)

    if not notification_data:
        return

    notification_type, title, message = notification_data

    Notification.create_for_user(
        recipient=instance.user,
        notification_type=notification_type,
        title=title,
        message=message,
        target_url=(
            f"/api/checkout/orders/{instance.id}/"
        ),
    )