from django.conf import settings
from django.db import migrations, models
from django.db.models import Q
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        (
            "shopping_cart",
            "0001_initial",
        ),
    ]

    operations = [
        migrations.RemoveField(
            model_name="cart",
            name="user",
        ),

        migrations.AddField(
            model_name="cart",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="carts",
                to=settings.AUTH_USER_MODEL,
            ),
        ),

        migrations.AddField(
            model_name="cart",
            name="session_id",
            field=models.CharField(
                blank=True,
                max_length=255,
                null=True,
                unique=True,
            ),
        ),

        migrations.AddField(
            model_name="cart",
            name="status",
            field=models.CharField(
                choices=[
                    ("active", "Active"),
                    ("completed", "Completed"),
                    ("expired", "Expired"),
                ],
                default="active",
                max_length=20,
            ),
        ),

        migrations.AddField(
            model_name="cart",
            name="expires_at",
            field=models.DateTimeField(
                blank=True,
                null=True,
            ),
        ),

        migrations.AddConstraint(
            model_name="cart",
            constraint=models.UniqueConstraint(
                condition=Q(
                    user__isnull=False,
                    status="active",
                ),
                fields=("user",),
                name="one_active_cart_per_user",
            ),
        ),

        migrations.AddConstraint(
            model_name="cart",
            constraint=models.UniqueConstraint(
                condition=Q(
                    session_id__isnull=False,
                    status="active",
                ),
                fields=("session_id",),
                name="one_active_cart_per_session",
            ),
        ),

        migrations.AddConstraint(
            model_name="cart",
            constraint=models.CheckConstraint(
                condition=(
                    Q(user__isnull=False)
                    | Q(session_id__isnull=False)
                ),
                name="cart_has_owner",
            ),
        ),

        migrations.AddConstraint(
            model_name="cartitem",
            constraint=models.UniqueConstraint(
                fields=("cart", "product"),
                name="unique_product_per_cart",
            ),
        ),
    ]