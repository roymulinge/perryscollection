from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product


class ProductDetailAPIViewTests(APITestCase):

    def setUp(self):
        self.category = Category.objects.create(
            name="Shoes"
        )

    def create_product(self, **kwargs):
        defaults = {
            "sku": "SHOE-001",
            "name": "Running Shoe",
            "category": self.category,
            "price": Decimal("100.00"),
            "compare_at_price": Decimal("150.00"),
            "stock": 10,
            "available": True,
            "is_active": True,
            "featured": False,
            "description": "A running shoe",
        }

        defaults.update(kwargs)

        return Product.objects.create(**defaults)

    def get_url(self, product):
        return reverse(
            "products:product_detail",
            kwargs={"slug": product.slug},
        )

    # =========================================================
    # SUCCESSFUL RETRIEVAL
    # =========================================================

    def test_product_detail_returns_success(self):
        product = self.create_product()

        response = self.client.get(self.get_url(product))

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_product_detail_returns_correct_product(self):
        product = self.create_product()

        response = self.client.get(self.get_url(product))

        self.assertEqual(
            response.data["name"],
            "Running Shoe",
        )

        self.assertEqual(
            response.data["sku"],
            "SHOE-001",
        )

    def test_product_detail_uses_slug_lookup(self):
        product = self.create_product(
            name="Running Shoes",
            sku="RUN-001",
        )

        response = self.client.get(
            reverse(
                "products:product_detail",
                kwargs={"slug": product.slug},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["name"],
            "Running Shoes",
        )

    # =========================================================
    # NOT FOUND
    # =========================================================

    def test_nonexistent_product_returns_404(self):
        response = self.client.get(
            reverse(
                "products:product_detail",
                kwargs={"slug": "does-not-exist"},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.assertEqual(
            response.data["error"],
            "Product not found",
        )

    # =========================================================
    # VISIBILITY
    # =========================================================

    def test_inactive_product_returns_404(self):
        product = self.create_product(
            is_active=False,
            available=False,
        )

        response = self.client.get(self.get_url(product))

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_unavailable_product_returns_404(self):
        product = self.create_product(
            available=False,
            is_active=True,
        )

        response = self.client.get(self.get_url(product))

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_inactive_product_returns_404(self):
        product = self.create_product(
            is_active=False,
            available=False,
        )

        response = self.client.get(
            reverse(
                "products:product_detail",
                kwargs={"slug": product.slug},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # STOCK DOES NOT DIRECTLY CONTROL DETAIL VISIBILITY
    # =========================================================

    def test_zero_stock_product_can_still_be_returned_when_available(self):
        """
        The view filters on available=True and is_active=True.
        It does NOT directly filter stock > 0.

        Therefore, if a product is available and active, the detail
        endpoint can return it even when stock is zero.

        This test documents the current API behavior.
        """
        product = self.create_product(
            stock=0,
            available=False,
        )

        # The model prevents available=True with stock=0.
        # We explicitly update the database to test the view's
        # actual filtering behavior.
        Product.objects.filter(pk=product.pk).update(
            stock=0,
            available=True,
            is_active=True,
        )

        response = self.client.get(self.get_url(product))

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["name"],
            "Running Shoe",
        )