from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from products.models import Product

from .models import Cart, CartItem


class CartService:
    """
    Business logic for the Cart domain.

    Views handle HTTP.
    Serializers handle API input/output validation.
    This service handles cart business rules.
    """

    @staticmethod
    @transaction.atomic
    def get_or_create_cart(
        *,
        user=None,
        session_id=None,
    ):
        """
        Return the active cart belonging to either:

        - an authenticated user
        - a guest session
        """

        if user is None and not session_id:
            raise ValidationError(
                "A user or session_id is required."
            )

        # ---------------------------------------------------------
        # AUTHENTICATED USER CART
        # ---------------------------------------------------------

        if user is not None:
            cart, created = Cart.objects.get_or_create(
                user=user,
                status=Cart.Status.ACTIVE,
                defaults={
                    "session_id": None,
                    "expires_at": None,
                },
            )

            return cart

        # ---------------------------------------------------------
        # GUEST CART
        # ---------------------------------------------------------

        cart = (
            Cart.objects
            .filter(
                session_id=session_id,
                status=Cart.Status.ACTIVE,
            )
            .first()
        )

        if cart:
            # A guest cart may have expired.
            if (
                cart.expires_at
                and cart.expires_at <= timezone.now()
            ):
                cart.status = Cart.Status.EXPIRED

                cart.save(
                    update_fields=["status"]
                )

            else:
                return cart

        return Cart.objects.create(
            session_id=session_id,
            status=Cart.Status.ACTIVE,
            expires_at=(
                timezone.now()
                + timedelta(days=1)
            ),
        )

    # -------------------------------------------------------------
    # ADD ITEM
    # -------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def add_item(
        *,
        cart,
        product_id,
        quantity,
    ):
        """
        Add a product to the cart.

        If the product already exists, increase its quantity.

        Product stock is locked while this operation is performed.
        """

        if cart.status != Cart.Status.ACTIVE:
            raise ValidationError(
                "This cart is no longer active."
            )

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

        item = (
            CartItem.objects
            .select_for_update()
            .filter(
                cart=cart,
                product=product,
            )
            .first()
        )

        current_quantity = (
            item.quantity
            if item
            else 0
        )

        requested_quantity = (
            current_quantity + quantity
        )

        if requested_quantity > product.stock:
            raise ValidationError(
                f"Only {product.stock} "
                f"items are available."
            )

        if item:
            item.quantity = requested_quantity

            item.save(
                update_fields=["quantity"]
            )

            return item

        return CartItem.objects.create(
            cart=cart,
            product=product,
            quantity=quantity,
        )

    # -------------------------------------------------------------
    # UPDATE ITEM
    # -------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def update_item(
        *,
        cart,
        product_id,
        quantity,
    ):
        """
        Set the quantity of an existing cart item.

        quantity = 0 removes the item.
        """

        if cart.status != Cart.Status.ACTIVE:
            raise ValidationError(
                "This cart is no longer active."
            )

        item = (
            CartItem.objects
            .select_for_update()
            .filter(
                cart=cart,
                product_id=product_id,
            )
            .first()
        )

        if item is None:
            raise ValidationError(
                "Product is not in the cart."
            )

        # ---------------------------------------------------------
        # ZERO MEANS REMOVE
        # ---------------------------------------------------------

        if quantity == 0:
            item.delete()
            return None

        # ---------------------------------------------------------
        # LOCK CURRENT PRODUCT
        # ---------------------------------------------------------

        product = (
            Product.objects
            .select_for_update()
            .filter(
                id=product_id,
            )
            .first()
        )

        if product is None:
            raise ValidationError(
                "Product no longer exists."
            )

        if not product.is_active:
            raise ValidationError(
                "Product is no longer active."
            )

        if not product.available:
            raise ValidationError(
                "Product is no longer available."
            )

        if product.stock <= 0:
            raise ValidationError(
                "Product is out of stock."
            )

        if quantity > product.stock:
            raise ValidationError(
                f"Only {product.stock} "
                f"items are available."
            )

        item.quantity = quantity

        item.save(
            update_fields=["quantity"]
        )

        return item

    # -------------------------------------------------------------
    # REMOVE ITEM
    # -------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def remove_item(
        *,
        cart,
        product_id,
    ):
        """
        Remove one product from the cart.
        """

        if cart.status != Cart.Status.ACTIVE:
            raise ValidationError(
                "This cart is no longer active."
            )

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

    # -------------------------------------------------------------
    # CLEAR CART
    # -------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def clear_cart(
        *,
        cart,
    ):
        """
        Remove all items while keeping the cart itself active.
        """

        if cart.status != Cart.Status.ACTIVE:
            raise ValidationError(
                "This cart is no longer active."
            )

        cart.items.all().delete()

    # -------------------------------------------------------------
    # MERGE GUEST CART
    # -------------------------------------------------------------

    @staticmethod
    @transaction.atomic
    def merge_guest_cart(
        *,
        user,
        session_id,
    ):
        """
        Merge the current guest cart into the authenticated
        user's active cart.

        Rules:

        - No guest cart -> return/create user cart.
        - No user cart -> convert guest cart into user cart.
        - Both exist -> merge quantities.
        - Duplicate products have their quantities combined.
        - Merged quantity cannot exceed current stock.
        - Guest cart becomes COMPLETED after successful merge.
        """

        guest_cart = (
            Cart.objects
            .select_for_update()
            .filter(
                session_id=session_id,
                status=Cart.Status.ACTIVE,
            )
            .first()
        )

        # ---------------------------------------------------------
        # NO GUEST CART
        # ---------------------------------------------------------

        if guest_cart is None:
            return CartService.get_or_create_cart(
                user=user,
            )

        # ---------------------------------------------------------
        # CHECK EXPIRATION
        # ---------------------------------------------------------

        if (
            guest_cart.expires_at
            and guest_cart.expires_at <= timezone.now()
        ):
            guest_cart.status = Cart.Status.EXPIRED

            guest_cart.save(
                update_fields=["status"]
            )

            return CartService.get_or_create_cart(
                user=user,
            )

        # ---------------------------------------------------------
        # GET USER CART
        # ---------------------------------------------------------

        user_cart = (
            Cart.objects
            .select_for_update()
            .filter(
                user=user,
                status=Cart.Status.ACTIVE,
            )
            .first()
        )

        # ---------------------------------------------------------
        # USER HAS NO CART
        #
        # Convert guest cart directly into user cart.
        # ---------------------------------------------------------

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

        # ---------------------------------------------------------
        # BOTH CARTS EXIST
        # ---------------------------------------------------------

        guest_items = (
            guest_cart.items
            .select_related("product")
            .all()
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

            # Product is no longer purchasable.
            # Do not transfer it.
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

            # -----------------------------------------------------
            # IMPORTANT:
            #
            # We do NOT silently exceed stock.
            # -----------------------------------------------------

            if merged_quantity > product.stock:
                raise ValidationError(
                    f"Cannot merge {product.name}. "
                    f"Only {product.stock} items "
                    f"are currently available."
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

        # ---------------------------------------------------------
        # GUEST CART IS NOW FINISHED
        # ---------------------------------------------------------

        guest_cart.status = Cart.Status.COMPLETED

        guest_cart.save(
            update_fields=["status"]
        )

        guest_cart.items.all().delete()

        return user_cart