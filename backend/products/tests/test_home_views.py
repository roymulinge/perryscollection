from decimal import Decimal
from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from django.core.cache import cache
from rest_framework.test import APITestCase

from products.models import Category, Product


class HomeAPIViewTests(APITestCase):

    def setUp(self):
        cache.clear()
        self.url = reverse("products:home")

        self.shoes = Category.objects.create(
            name="Shoes",
        )

    def create_product(self, **kwargs):
        defaults = {
            "sku": "SHOE-001",
            "name": "Running Shoe",
            "category": self.shoes,
            "price": Decimal("100.00"),
            "stock": 10,
            "available": True,
            "is_active": True,
            "featured": True,
            "description": "A running shoe",
        }

        defaults.update(kwargs)

        return Product.objects.create(**defaults)

    # =========================================================
    # BASIC RESPONSE
    # =========================================================

    def test_home_returns_success(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_home_returns_expected_response_structure(self):
        response = self.client.get(self.url)

        self.assertIn(
            "featured_products",
            response.data,
        )

        self.assertIn(
            "categories",
            response.data,
        )

    # =========================================================
    # FEATURED PRODUCTS
    # =========================================================

    def test_home_returns_featured_products(self):
        self.create_product()

        response = self.client.get(self.url)

        products = response.data["featured_products"]

        self.assertEqual(len(products), 1)
        self.assertEqual(
            products[0]["name"],
            "Running Shoe",
        )

    def test_non_featured_product_is_not_returned(self):
        self.create_product(
            featured=False,
        )

        response = self.client.get(self.url)

        self.assertEqual(
            len(response.data["featured_products"]),
            0,
        )

    def test_inactive_product_is_not_returned(self):
        self.create_product(
            is_active=False,
            available=False,
        )

        response = self.client.get(self.url)

        self.assertEqual(
            len(response.data["featured_products"]),
            0,
        )

    def test_unavailable_product_is_not_returned(self):
        self.create_product(
            available=False,
        )

        response = self.client.get(self.url)

        self.assertEqual(
            len(response.data["featured_products"]),
            0,
        )

    # =========================================================
    # ORDERING
    # =========================================================

    def test_featured_products_are_ordered_newest_first(self):
        older = self.create_product(
            sku="SHOE-001",
            name="Older Shoe",
        )

        newer = self.create_product(
            sku="SHOE-002",
            name="Newer Shoe",
        )

        response = self.client.get(self.url)

        products = response.data["featured_products"]

        self.assertEqual(
            products[0]["name"],
            newer.name,
        )

        self.assertEqual(
            products[1]["name"],
            older.name,
        )

    # =========================================================
    # CATEGORIES
    # =========================================================

    def test_home_returns_categories(self):
        Category.objects.create(
            name="Clothing",
        )

        response = self.client.get(self.url)

        categories = response.data["categories"]

        self.assertEqual(len(categories), 2)

    def test_home_returns_category_data(self):
        response = self.client.get(self.url)

        categories = response.data["categories"]

        self.assertEqual(
            categories[0]["name"],
            "Shoes",
        )

    # =========================================================
    # CATEGORY CACHE
    # =========================================================

    @patch("products.views.cache")
    def test_categories_are_loaded_from_cache_when_available(
        self,
        mock_cache,
    ):
        cached_categories = [
            self.shoes,
        ]

        mock_cache.get.return_value = cached_categories

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        mock_cache.get.assert_called_once_with(
            "all_categories",
        )

        mock_cache.set.assert_not_called()

    @patch("products.views.cache")
    def test_categories_are_cached_when_cache_is_empty(
        self,
        mock_cache,
    ):
        mock_cache.get.return_value = None

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        mock_cache.get.assert_called_once_with(
            "all_categories",
        )

        mock_cache.set.assert_called_once_with(
            "all_categories",
            [self.shoes],
            3600,
        )