from .models import Notification


class NotificationService:
    """
    Handles creation of user notifications.

    Notifications are created explicitly from business events
    rather than automatically on every model save.
    """

    @staticmethod
    def order_placed(order):
        """
        Notify the customer that their order was successfully placed.
        """

        if not order.user:
            return None

        return Notification.create_for_user(
            recipient=order.user,
            notification_type="order_placed",
            title=f"Order #{order.id} Confirmed",
            message=(
                f"Hi {order.full_name}, your order has been placed "
                f"successfully. Total: KES {order.total_amount}."
            ),
            target_url=f"/orders/{order.id}/",
        )

    @staticmethod
    def order_paid(order):
        """
        Notify the customer that payment was successfully received.
        """

        if not order.user:
            return None

        return Notification.create_for_user(
            recipient=order.user,
            notification_type="order_paid",
            title=f"Payment Confirmed — Order #{order.id}",
            message=(
                f"We've received your payment of "
                f"KES {order.total_amount}. "
                f"Your order is being prepared."
            ),
            target_url=f"/orders/{order.id}/",
        )

    @staticmethod
    def order_shipped(order):
        if not order.user:
            return None

        return Notification.create_for_user(
            recipient=order.user,
            notification_type="order_shipped",
            title=f"Order #{order.id} Has Shipped!",
            message=(
                "Great news — your order is on its way. "
                "Check your order for tracking details."
            ),
            target_url=f"/orders/{order.id}/",
        )

    @staticmethod
    def order_delivered(order):
        if not order.user:
            return None

        return Notification.create_for_user(
            recipient=order.user,
            notification_type="order_delivered",
            title=f"Order #{order.id} Delivered",
            message=(
                "Your order has been delivered. "
                "We hope you enjoy your purchase!"
            ),
            target_url=f"/orders/{order.id}/",
        )

    @staticmethod
    def order_cancelled(order):
        if not order.user:
            return None

        return Notification.create_for_user(
            recipient=order.user,
            notification_type="order_cancelled",
            title=f"Order #{order.id} Cancelled",
            message=(
                "Your order has been cancelled. "
                "Contact support if this was unexpected."
            ),
            target_url=f"/orders/{order.id}/",
        )