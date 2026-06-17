from django.db import models
from django.urls import reverse
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils.text import slugify
import logging

logger = logging.getLogger(__name__)


class Category(models.Model):
    name = models.CharField(max_length=200, unique=True)
    slug = models.SlugField(max_length=200, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']          # fixed typo
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
        return reverse('products:category_detail', args=[self.slug])


class Product(models.Model):
    # Core identifiers
    sku = models.CharField(
        max_length=50, unique=True, db_index=True,
        help_text="Stock Keeping Unit – must be unique"
    )
    name = models.CharField(max_length=200, db_index=True)
    slug = models.SlugField(max_length=200, unique=True, db_index=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,          # prevent orphaned products
        related_name='products'
    )

    # Pricing – decimal with validation
    price = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    compare_at_price = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True,
        help_text="Old price for sale display"
    )

    # Inventory
    stock = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    available = models.BooleanField(default=True)    # customer‑facing
    is_active = models.BooleanField(default=True, db_index=True)  # soft delete

    # Images (requires Pillow)
    image = models.ImageField(
        upload_to='products/%Y/%m/',   # organised by year/month
        blank=True, null=True
    )

    # Flags
    featured = models.BooleanField(default=False, db_index=True)

    # Content
    description = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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

    def clean(self):
        """Validate stock and available flag together"""
        if self.stock == 0 and self.available:
            raise ValidationError("Cannot mark product as available with zero stock.")
        if self.compare_at_price and self.compare_at_price <= self.price:
            raise ValidationError("Compare‑at price must be greater than current price.")

    def save(self, *args, **kwargs):
        # Auto‑generate slug if missing
        if not self.slug:
            self.slug = slugify(self.name)
        # Validate model
        self.full_clean()
        super().save(*args, **kwargs)


    @property
    def stock_value(self):
        """Total value of current stock (for reporting)"""
        return self.price * self.stock

    @property
    def in_stock(self):
        """Customer‑facing availability (incorporates stock and available flag)"""
        return self.available and self.stock > 0

    @property
    def is_low_stock(self):
        """Alerts for inventory management"""
        return self.stock <= self.low_stock_threshold

    def get_absolute_url(self):
        return reverse('products:product_detail', args=[self.slug])