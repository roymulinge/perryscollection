from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from products.models import Product
from shopping_cart.services import CartService

from .models import Order, OrderItem


class CheckoutService:
    """
    Business logic for converting a cart into an order.
    """

    @staticmethod
    @transaction.atomic
    def create_order(
        *,
        cart,
        user=None,
        checkout_data,
    ):
        """
        Convert the current cart into an Order.

        The entire operation happens inside one database transaction.

        Steps:
        1. Reject empty carts.
        2. Lock products.
        3. Re-check product availability and stock.
        4. Create the order.
        5. Create order items using the current product price.
        6. Reduce stock.
        7. Calculate the final order total.
        8. Complete the cart.
        """

        if not cart.items.exists():
            raise ValidationError(
                "Cannot checkout with an empty cart."
            )

        # Lock all products involved in this checkout.
        cart_items = list(
            cart.items
            .select_related("product")
            .select_for_update()
        )

        for item in cart_items:
            if item.product is None:
                raise ValidationError(
                    "Cart contains a deleted product."
                )

            product = (
                Product.objects
                .select_for_update()
                .filter(id=item.product_id)
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

            if product.stock <= 0:
                raise ValidationError(
                    f"{product.name} is out of stock."
                )

            if item.quantity > product.stock:
                raise ValidationError(
                    f"Only {product.stock} "
                    f"{product.name} items are available."
                )

        # Create the order first.
        order = Order.objects.create(
            user=user,
            email=checkout_data["email"],
            full_name=checkout_data["full_name"],
            phone_number=checkout_data.get("phone_number", ""),
            address_line1=checkout_data["address_line1"],
            address_line2=checkout_data.get("address_line2", ""),
            city=checkout_data["city"],
            postal_code=checkout_data["postal_code"],
            country=checkout_data["country"],
            payment_method=checkout_data["payment_method"],
            status="pending",
            is_paid=False,
        )

        # Create order items using the LIVE price.
        for item in cart_items:
            product = (
                Product.objects
                .select_for_update()
                .get(id=item.product_id)
            )

            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=item.quantity,
                price=product.price,
            )

            # Stock is changed while the product row is locked.
            Product.objects.filter(
                id=product.id
            ).update(
                stock=F("stock") - item.quantity
            )

        # Calculate the authoritative order total
        # from the OrderItems, not from the cart.
        order.update_total()

        # The cart is now finished.
        CartService.complete_cart(cart=cart)

        return order