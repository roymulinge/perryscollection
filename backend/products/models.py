from django.db import models, transaction, IntegrityError
from django.urls import reverse
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=200, unique=True)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Categories'
        indexes = [
            models.Index(fields=['slug']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)

        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse(
            'products:category_detail',
            args=[self.slug]
        )


class Product(models.Model):
    # -------------------------
    # Identity
    # -------------------------

    sku = models.CharField(
        max_length=50,
        unique=True,
        help_text="Stock Keeping Unit - must be unique"
    )

    name = models.CharField(
        max_length=200
    )

    slug = models.SlugField(
        max_length=200,
        unique=True,
        blank=True
    )

    # -------------------------
    # Classification
    # -------------------------

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='products'
    )

    # -------------------------
    # Pricing
    # -------------------------

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[
            MinValueValidator(0.01)
        ]
    )

    compare_at_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True
    )

    # -------------------------
    # Inventory
    # -------------------------

    stock = models.PositiveIntegerField(
        default=0
    )

    low_stock_threshold = models.PositiveIntegerField(
        default=5
    )

    # -------------------------
    # Availability / lifecycle
    # -------------------------

    available = models.BooleanField(
        default=True
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True
    )

    # -------------------------
    # Presentation
    # -------------------------

    image = models.ImageField(
        upload_to='products/%Y/%m/',
        blank=True,
        null=True
    )

    featured = models.BooleanField(
        default=False,
        db_index=True
    )

    description = models.TextField(
        blank=True
    )

    # -------------------------
    # Metadata
    # -------------------------

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ['-created_at']

        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['category', 'available']),
            models.Index(fields=['featured', 'available']),
            models.Index(fields=['-created_at']),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=['category', 'name'],
                name='unique_product_name_per_category'
            )
        ]

    def __str__(self):
        return f"{self.name} (SKU: {self.sku})"

    # -------------------------
    # Validation
    # -------------------------

    def clean(self):
        """
        Business rules that involve multiple fields.
        """

        if (
            self.compare_at_price is not None
            and self.compare_at_price <= self.price
        ):
            raise ValidationError(
                {
                    'compare_at_price':
                        'Compare-at price must be greater than current price.'
                }
            )

        if self.stock == 0 and self.available:
            raise ValidationError(
                {
                    'available':
                        'A product with zero stock cannot be available.'
                }
            )

        if not self.is_active and self.available:
            raise ValidationError(
                {
                    'available':
                        'An inactive product cannot be available.'
                }
            )

    # -------------------------
    # Slug generation
    # -------------------------

    def _generate_unique_slug(self):
        """
        Generate a URL-friendly slug.

        Example:

        Running Shoe
        running-shoe
        running-shoe-2
        running-shoe-3
        """

        base_slug = slugify(self.name)

        slug = base_slug
        counter = 2

        while (
            Product.objects
            .filter(slug=slug)
            .exclude(pk=self.pk)
            .exists()
        ):
            slug = f"{base_slug}-{counter}"
            counter += 1

        return slug

    # -------------------------
    # Save
    # -------------------------

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._generate_unique_slug()

        self.full_clean()

        super().save(*args, **kwargs)

    # -------------------------
    # Computed properties
    # -------------------------

    @property
    def stock_value(self):
        """
        Total monetary value of the current inventory.
        """

        return self.price * self.stock

    @property
    def in_stock(self):
        """
        Customer can purchase the product only when:

        1. It is active.
        2. It is available.
        3. It has stock.
        """

        return (
            self.is_active
            and self.available
            and self.stock > 0
        )

    @property
    def is_low_stock(self):
        """
        True when current stock is at or below
        the configured low-stock threshold.
        """

        return self.stock <= self.low_stock_threshold

    def get_absolute_url(self):
        return reverse(
            'products:product_detail',
            args=[self.slug]
        )