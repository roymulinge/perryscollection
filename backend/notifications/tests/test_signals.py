from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from checkout.models import Order
from notifications.models import Notification

User = get_user_model()


class OrderNotificationSignalTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email="customer@example.com",
            password="testpassword123",
        )

        self.order_data = {
            "user": self.user,
            "email": "customer@example.com",
            "full_name": "Test Customer",
            "phone_number": "0712345678",
            "address_line1": "Test Street",
            "address_line2": "",
            "city": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "total_amount": Decimal("2000.00"),
            "payment_method": "cash_on_delivery",
        }

    def test_order_created_creates_order_placed_notification(self):
        order = Order.objects.create(
            **self.order_data
        )

        notification = Notification.objects.get(
            recipient=self.user,
            notification_type="order_placed",
        )

        self.assertEqual(
            notification.title,
            f"Order #{order.id} Confirmed",
        )

        self.assertIn(
            "your order has been placed successfully",
            notification.message,
        )

        self.assertIn(
            str(order.id),
            notification.target_url,
        )

        self.assertFalse(
            notification.is_read
        )

    def test_paid_order_creates_payment_notification(self):
        order = Order.objects.create(
            **self.order_data
        )

        # The creation signal already creates order_placed.
        # Now change the status to paid.
        order.status = "paid"
        order.save()

        notification = Notification.objects.filter(
            recipient=self.user,
            notification_type="order_paid",
        ).latest("created_at")

        self.assertEqual(
            notification.title,
            f"Payment Confirmed — Order #{order.id}",
        )

        self.assertIn(
            "payment",
            notification.message.lower(),
        )

        self.assertFalse(
            notification.is_read
        )

    def test_shipped_order_creates_shipping_notification(self):
        order = Order.objects.create(
            **self.order_data
        )

        order.status = "shipped"
        order.save()

        notification = Notification.objects.filter(
            recipient=self.user,
            notification_type="order_shipped",
        ).latest("created_at")

        self.assertEqual(
            notification.title,
            f"Order #{order.id} Has Shipped!",
        )

    def test_delivered_order_creates_delivery_notification(self):
        order = Order.objects.create(
            **self.order_data
        )

        order.status = "delivered"
        order.save()

        notification = Notification.objects.filter(
            recipient=self.user,
            notification_type="order_delivered",
        ).latest("created_at")

        self.assertEqual(
            notification.title,
            f"Order #{order.id} Delivered",
        )

    def test_cancelled_order_creates_cancellation_notification(self):
        order = Order.objects.create(
            **self.order_data
        )

        order.status = "cancelled"
        order.save()

        notification = Notification.objects.filter(
            recipient=self.user,
            notification_type="order_cancelled",
        ).latest("created_at")

        self.assertEqual(
            notification.title,
            f"Order #{order.id} Cancelled",
        )

    def test_anonymous_order_does_not_create_notification(self):
        order = Order.objects.create(
            **{
                **self.order_data,
                "user": None,
            }
        )

        self.assertFalse(
            Notification.objects.filter(
                notification_type="order_placed",
            ).exists()
        )

    def test_notification_belongs_to_correct_user(self):
        another_user = User.objects.create_user(
            email="another@example.com",
            password="testpassword123",
        )

        order = Order.objects.create(
            **self.order_data
        )

        notification = Notification.objects.get(
            notification_type="order_placed",
            recipient=self.user,
        )

        self.assertEqual(
            notification.recipient,
            self.user,
        )

        self.assertNotEqual(
            notification.recipient,
            another_user,
        )