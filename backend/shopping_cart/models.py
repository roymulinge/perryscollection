from django.conf import settings
from django.db import models
from django.db.models import Q

from products.models import Product


class Cart(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        EXPIRED = "expired", "Expired"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="carts",
    )

    session_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    expires_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            # Only one active cart per authenticated user.
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(
                    user__isnull=False,
                    status="active",
                ),
                name="one_active_cart_per_user",
            ),

            # Only one active cart per guest session.
            models.UniqueConstraint(
                fields=["session_id"],
                condition=Q(
                    session_id__isnull=False,
                    status="active",
                ),
                name="one_active_cart_per_session",
            ),

            # A cart must belong either to a user or a guest session.
            models.CheckConstraint(
                condition=(
                    Q(user__isnull=False)
                    | Q(session_id__isnull=False)
                ),
                name="cart_has_owner",
            ),
        ]

    def __str__(self):
        if self.user:
            return f"Cart ({self.user.email})"

        return f"Guest Cart ({self.session_id})"

    @property
    def total_price(self):
        return sum(
            item.total_price
            for item in self.items.select_related("product").all()
        )

class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items",
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cart_items",
    )

    quantity = models.PositiveIntegerField(
        default=1
    )

    added_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["added_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product"],
                name="unique_product_per_cart",
            ),
        ]

    def __str__(self):
        product_name = (
            self.product.name
            if self.product
            else "Deleted product"
        )

        return (
            f"{product_name} x {self.quantity} "
            f"in cart {self.cart_id}"
        )

    @property
    def total_price(self):
        if not self.product:
            return 0

        return self.product.price * self.quantity