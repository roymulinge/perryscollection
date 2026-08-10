from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from products.models import Product

from .models import Cart, CartItem


class CartService:
    """
    Business logic for the Cart domain.
    """

    @staticmethod
    @transaction.atomic
    def get_or_create_cart(
        *,
        user=None,
        session_id=None,
    ):
        if user is None and not session_id:
            raise ValidationError(
                "A user or session_id is required."
            )

        if user is not None:
            cart = (
                Cart.objects
                .filter(
                    user=user,
                    status=Cart.Status.ACTIVE,
                )
                .first()
            )

            if cart:
                return cart

            return Cart.objects.create(
                user=user,
                status=Cart.Status.ACTIVE,
            )

        cart = (
            Cart.objects
            .filter(
                session_id=session_id,
                status=Cart.Status.ACTIVE,
            )
            .first()
        )

        if cart:
            return cart

        return Cart.objects.create(
            session_id=session_id,
            status=Cart.Status.ACTIVE,
            expires_at=timezone.now() + timedelta(days=1),
        )

    @staticmethod
    @transaction.atomic
    def add_item(
        *,
        cart,
        product_id,
        quantity,
    ):
        product = (
            Product.objects
            .select_for_update()
            .filter(
                id=product_id,
                is_active=True,
                available=True,
            )
            .first()
        )

        if product is None:
            raise ValidationError(
                "Product not found or unavailable."
            )

        if product.stock <= 0:
            raise ValidationError(
                "Product is out of stock."
            )

        existing_item = (
            CartItem.objects
            .select_for_update()
            .filter(
                cart=cart,
                product=product,
            )
            .first()
        )

        current_quantity = (
            existing_item.quantity
            if existing_item
            else 0
        )

        requested_quantity = (
            current_quantity + quantity
        )

        if requested_quantity > product.stock:
            raise ValidationError(
                f"Only {product.stock} items are available."
            )

        if existing_item:
            existing_item.quantity = requested_quantity
            existing_item.save(
                update_fields=["quantity"]
            )
            return existing_item

        return CartItem.objects.create(
            cart=cart,
            product=product,
            quantity=quantity,
        )

    @staticmethod
    @transaction.atomic
    def update_item(
        *,
        cart,
        product_id,
        quantity,
    ):
        item = (
            CartItem.objects
            .select_for_update()
            .filter(
                cart=cart,
                product_id=product_id,
            )
            .select_related("product")
            .first()
        )

        if item is None:
            raise ValidationError(
                "Product is not in the cart."
            )

        if quantity == 0:
            item.delete()
            return None

        product = (
            Product.objects
            .select_for_update()
            .filter(id=product_id)
            .first()
        )

        if product is None:
            raise ValidationError(
                "Product no longer exists."
            )

        if not product.is_active or not product.available:
            raise ValidationError(
                "Product is no longer available."
            )

        if quantity > product.stock:
            raise ValidationError(
                f"Only {product.stock} items are available."
            )

        item.quantity = quantity
        item.save(
            update_fields=["quantity"]
        )

        return item

    @staticmethod
    @transaction.atomic
    def remove_item(
        *,
        cart,
        product_id,
    ):
        deleted_count, _ = (
            CartItem.objects
            .filter(
                cart=cart,
                product_id=product_id,
            )
            .delete()
        )

        if deleted_count == 0:
            raise ValidationError(
                "Product is not in the cart."
            )

    @staticmethod
    @transaction.atomic
    def clear_cart(*, cart):
        cart.items.all().delete()

    @staticmethod
    @transaction.atomic
    def merge_guest_cart(
        *,
        user,
        session_id,
    ):
        guest_cart = (
            Cart.objects
            .filter(
                session_id=session_id,
                status=Cart.Status.ACTIVE,
            )
            .first()
        )

        if guest_cart is None:
            return CartService.get_or_create_cart(
                user=user,
            )

        user_cart = (
            Cart.objects
            .filter(
                user=user,
                status=Cart.Status.ACTIVE,
            )
            .first()
        )

        if user_cart is None:
            guest_cart.user = user
            guest_cart.session_id = None
            guest_cart.expires_at = None
            guest_cart.save(
                update_fields=[
                    "user",
                    "session_id",
                    "expires_at",
                ]
            )

            return guest_cart

        guest_items = list(
            guest_cart.items.select_related("product")
        )

        for guest_item in guest_items:
            if guest_item.product is None:
                continue

            product = (
                Product.objects
                .select_for_update()
                .filter(
                    id=guest_item.product_id,
                    is_active=True,
                    available=True,
                )
                .first()
            )

            if product is None:
                continue

            existing_item = (
                CartItem.objects
                .select_for_update()
                .filter(
                    cart=user_cart,
                    product=product,
                )
                .first()
            )

            current_quantity = (
                existing_item.quantity
                if existing_item
                else 0
            )

            merged_quantity = (
                current_quantity
                + guest_item.quantity
            )

            if merged_quantity > product.stock:
                raise ValidationError(
                    f"Cannot merge {product.name}. "
                    f"Only {product.stock} items are available."
                )

            if existing_item:
                existing_item.quantity = merged_quantity
                existing_item.save(
                    update_fields=["quantity"]
                )
            else:
                CartItem.objects.create(
                    cart=user_cart,
                    product=product,
                    quantity=guest_item.quantity,
                )

        guest_cart.status = Cart.Status.COMPLETED
        guest_cart.save(
            update_fields=["status"]
        )

        guest_cart.items.all().delete()

        return user_cart

    @staticmethod
    @transaction.atomic
    def complete_cart(*, cart):
        if not cart.items.exists():
            raise ValidationError(
                "Cannot checkout with an empty cart."
            )

        items = (
            cart.items
            .select_related("product")
            .select_for_update()
        )

        for item in items:
            if item.product is None:
                raise ValidationError(
                    "Cart contains a deleted product."
                )

            product = (
                Product.objects
                .select_for_update()
                .get(id=item.product_id)
            )

            if not product.is_active:
                raise ValidationError(
                    f"{product.name} is no longer active."
                )

            if not product.available:
                raise ValidationError(
                    f"{product.name} is no longer available."
                )

            if item.quantity > product.stock:
                raise ValidationError(
                    f"Only {product.stock} "
                    f"{product.name} items are available."
                )

        cart.status = Cart.Status.COMPLETED
        cart.save(
            update_fields=["status"]
        )

        cart.items.all().delete()

        return cart