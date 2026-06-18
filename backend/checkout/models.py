from django.db import models
from django.conf import settings
from products.models import Product
from decimal import Decimal

class Order(models.Model):
    """
    Represents a customer order.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('mpesa', 'M-pesa'),
        ('cash_on_delivery', 'Cash on Delivery'),
    ]

    # User association (optional for now)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )

    # Order info
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Customer details (denormalised for safety)
    email = models.EmailField()
    full_name = models.CharField(max_length=200)
    phone_number = models.CharField(
        max_length =15, blank=True,
        help_text = "Format: 2547XXXXXXXX (used for Mpesa STK Push)"
    )
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)

    # Payment & totals
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    #Payemnt method
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHOD_CHOICES,
        default='cash_on_delivery'
    )
    payment_intent_id = models.CharField(max_length=255, blank=True, help_text="Stripe/PayPal payment ID")
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(blank=True, null=True)

    #Mpesa specific tracking fields
    mpesa_checkout_request_id = models.CharField(
        max_length=100, blank=True, db_index=True,
        help_text="Safaricom's CheckoutRequestId for matching callback responses"
    )

    #MerchantRequestId - Safaricom also sends this, useful for support tickets
    mpesa_merchant_request_id = models.CharField(max_length=100, blank=True)

    mpesa_receipt_number = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['is_paid']),
            models.Index(fields=['mpesa_checkout_request_id']),
        ]

    def __str__(self):
        return f"Order #{self.id} - {self.full_name}"

    def update_total(self):
        """Calculate total from related OrderItem instances."""
        total = self.items.aggregate(total=models.Sum('subtotal'))['total'] or Decimal('0.00')
        self.total_amount = total
        self.save(update_fields=['total_amount'])


class OrderItem(models.Model):
    """
    Individual product line item within an order.
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='order_items')
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)   # price at purchase time
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    class Meta:
        unique_together = ['order', 'product']   # one product per order once

    def save(self, *args, **kwargs):
        self.subtotal = self.price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} x {self.quantity} (Order #{self.order.id})"