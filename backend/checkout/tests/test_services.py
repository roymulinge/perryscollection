from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from products.models import Product, Category
from shopping_cart.models import Cart, CartItem

from checkout.models import Order, OrderItem
from checkout.services import CheckoutService


User = get_user_model()


class CheckoutServiceTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email="customer@example.com",
            password="testpassword123",
        )
        self.category = Category.objects.create(
            name="Test Category"
        )

        self.product = Product.objects.create(
        name="Test Product",
        sku="TEST-001",
        category=self.category,
        price=Decimal("1000.00"),
        stock=10,
        is_active=True,
        available=True,
    )

        self.cart = Cart.objects.create(
            user=self.user,
        )

        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=2,
        )

        self.checkout_data = {
            "email": "customer@example.com",
            "full_name": "Test Customer",
            "address_line1": "Test Street",
            "address_line2": "",
            "city": "Nairobi",
            "postal_code": "00100",
            "country": "Kenya",
            "payment_method": "cash_on_delivery",
            "phone_number": "",
        }

    def test_create_order_from_cart(self):
        order = CheckoutService.create_order(
            cart=self.cart,
            checkout_data=self.checkout_data,
        )

        self.assertIsNotNone(order.id)

        self.assertEqual(
            order.user,
            self.user,
        )

        self.assertEqual(
            order.full_name,
            "Test Customer",
        )

        self.assertEqual(
            order.payment_method,
            "cash_on_delivery",
        )

        self.assertEqual(
            order.total_amount,
            Decimal("2000.00"),
        )

        self.assertEqual(
            order.items.count(),
            1,
        )

    def test_order_item_uses_current_product_price(self):
        self.product.price = Decimal("2000.00")
        self.product.save(
            update_fields=["price"]
        )

        order = CheckoutService.create_order(
            cart=self.cart,
            checkout_data=self.checkout_data,
        )

        order_item = order.items.get()

        self.assertEqual(
            order_item.price,
            Decimal("2000.00"),
        )

        self.assertEqual(
            order_item.subtotal,
            Decimal("4000.00"),
        )

        self.assertEqual(
            order.total_amount,
            Decimal("4000.00"),
        )

    def test_empty_cart_is_rejected(self):
        self.cart.items.all().delete()

        with self.assertRaises(ValidationError):
            CheckoutService.create_order(
                cart=self.cart,
                checkout_data=self.checkout_data,
            )

        self.assertEqual(
            Order.objects.count(),
            0,
        )

    def test_deleted_product_is_rejected(self):
        self.product.delete()

        with self.assertRaises(ValidationError):
            CheckoutService.create_order(
                cart=self.cart,
                checkout_data=self.checkout_data,
            )

        self.assertEqual(
            Order.objects.count(),
            0,
        )

    def test_inactive_product_is_rejected(self):
        self.product.is_active = False
        self.product.available = False
        self.product.save(
            update_fields=["is_active", "available"]
        )

        with self.assertRaises(ValidationError):
            CheckoutService.create_order(
                cart=self.cart,
                checkout_data=self.checkout_data,
            )

        self.assertEqual(
            Order.objects.count(),
            0,
        )

    def test_unavailable_product_is_rejected(self):
        self.product.available = False
        self.product.save(
            update_fields=["available"]
        )

        with self.assertRaises(ValidationError):
            CheckoutService.create_order(
                cart=self.cart,
                checkout_data=self.checkout_data,
            )

        self.assertEqual(
            Order.objects.count(),
            0,
        )

    def test_quantity_greater_than_stock_is_rejected(self):
        self.product.stock = 1
        self.product.save(
            update_fields=["stock"]
        )

        with self.assertRaises(ValidationError):
            CheckoutService.create_order(
                cart=self.cart,
                checkout_data=self.checkout_data,
            )

        self.assertEqual(
            Order.objects.count(),
            0,
        )

    @patch("checkout.services.mpesa.trigger_stk_push")
    def test_mpesa_checkout_initiates_stk_push(
        self,
        mock_stk_push,
    ):
        mock_stk_push.return_value = {
            "ResponseCode": "0",
            "ResponseDescription": "Success",
            "CheckoutRequestID": "ws_CO_TEST123",
            "MerchantRequestID": "29115-TEST",
        }

        checkout_data = {
            **self.checkout_data,
            "payment_method": "mpesa",
            "phone_number": "0712345678",
        }

        order = CheckoutService.create_order(
            cart=self.cart,
            checkout_data=checkout_data,
        )

        mock_stk_push.assert_called_once()

        self.assertEqual(
            order.payment_method,
            "mpesa",
        )

        self.assertEqual(
            order.mpesa_checkout_request_id,
            "ws_CO_TEST123",
        )

        self.assertEqual(
            order.mpesa_merchant_request_id,
            "29115-TEST",
        )

        self.assertFalse(
            order.is_paid
        )

    @patch("checkout.services.mpesa.trigger_stk_push")
    def test_mpesa_failure_does_not_create_order(
        self,
        mock_stk_push,
    ):
        mock_stk_push.return_value = {
            "ResponseCode": "1",
            "ResponseDescription": "Failed",
        }

        checkout_data = {
            **self.checkout_data,
            "payment_method": "mpesa",
            "phone_number": "0712345678",
        }

        with self.assertRaises(ValidationError):
            CheckoutService.create_order(
                cart=self.cart,
                checkout_data=checkout_data,
            )

        self.assertEqual(
            Order.objects.count(),
            0,
        )

    @patch("checkout.services.mpesa.trigger_stk_push")
    def test_mpesa_exception_does_not_create_order(
        self,
        mock_stk_push,
    ):
        mock_stk_push.side_effect = Exception(
            "M-Pesa unavailable"
        )

        checkout_data = {
            **self.checkout_data,
            "payment_method": "mpesa",
            "phone_number": "0712345678",
        }

        with self.assertRaises(ValidationError):
            CheckoutService.create_order(
                cart=self.cart,
                checkout_data=checkout_data,
            )

        self.assertEqual(
            Order.objects.count(),
            0,
        )