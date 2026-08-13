from django.db import transaction

from rest_framework.exceptions import ValidationError

from products.models import Product

from .models import Order, OrderItem
from . import mpesa
from django.conf import settings

class CheckoutService:
    """
    Business logic for converting a shopping cart
    into an order.
    """

    @staticmethod
    @transaction.atomic
    def create_order(
        *,
        cart,
        checkout_data,
    ):
        """
        Create an order from the current cart.

        The cart itself is not blindly trusted.

        Products and stock are checked again while
        the transaction is active.
        """

        cart_items = list(
            cart.items
            .select_related("product")
            .all()
        )

        if not cart_items:
            raise ValidationError(
                "Cannot checkout with an empty cart."
            )

        locked_products = {}

        for cart_item in cart_items:
            if cart_item.product_id is None:
                raise ValidationError(
                    "Cart contains a deleted product."
                )

            product = (
                Product.objects
                .select_for_update()
                .filter(
                    id=cart_item.product_id
                )
                .first()
            )

            if product is None:
                raise ValidationError(
                    "A product in the cart no longer exists."
                )

            if not product.is_active:
                raise ValidationError(
                    f"{product.name} is no longer active."
                )

            if not product.available:
                raise ValidationError(
                    f"{product.name} is no longer available."
                )

            if cart_item.quantity > product.stock:
                raise ValidationError(
                    f"Only {product.stock} "
                    f"{product.name} items are available."
                )

            locked_products[
                product.id
            ] = product

        payment_method = checkout_data[
            "payment_method"
        ]

        phone_number = checkout_data.get(
            "phone_number",
            "",
        )

        order = Order.objects.create(
            user=(
                cart.user
                if cart.user_id
                else None
            ),
            email=checkout_data["email"],
            full_name=checkout_data["full_name"],
            phone_number=phone_number,
            address_line1=checkout_data[
                "address_line1"
            ],
            address_line2=checkout_data.get(
                "address_line2",
                "",
            ),
            city=checkout_data["city"],
            postal_code=checkout_data[
                "postal_code"
            ],
            country=checkout_data["country"],
            payment_method=payment_method,
        )

        total_amount = 0

        for cart_item in cart_items:
            product = locked_products[
                cart_item.product_id
            ]

            order_item = OrderItem.objects.create(
                order=order,
                product=product,
                quantity=cart_item.quantity,
                price=product.price,
            )

            total_amount += order_item.subtotal

        order.total_amount = total_amount
        order.save(
            update_fields=["total_amount"]
        )

        if payment_method == "mpesa":
            try:
                mpesa_response = (
                    mpesa.trigger_stk_push(
                        phone_number=phone_number,
                        amount=order.total_amount,
                        order_id=order.id,
                        callback_url=settings.MPESA_CALLBACK_URL,
                    )
                )
            except Exception as exc:
                print("MPESA ERROR:", repr(exc))

                raise ValidationError(
                    {
                        "payment": (
                            f"Unable to initiate M-Pesa payment: {exc}"
                        )
                    }
                ) from exc

            response_code = mpesa_response.get(
                "ResponseCode"
            )

            if response_code != "0":
                raise ValidationError(
                    {
                        "payment": (
                            mpesa_response.get(
                                "ResponseDescription",
                                "M-Pesa payment "
                                "could not be initiated.",
                            )
                        )
                    }
                )

            checkout_request_id = (
                mpesa_response.get(
                    "CheckoutRequestID"
                )
            )

            merchant_request_id = (
                mpesa_response.get(
                    "MerchantRequestID"
                )
            )

            order.mpesa_checkout_request_id = (
                checkout_request_id or ""
            )

            order.mpesa_merchant_request_id = (
                merchant_request_id or ""
            )

            order.save(
                update_fields=[
                    "mpesa_checkout_request_id",
                    "mpesa_merchant_request_id",
                ]
            )

        return order