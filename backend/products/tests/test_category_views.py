from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product


class CategoryListAPIViewTests(APITestCase):

    def setUp(self):
        self.url = reverse("products:category_list")

    def create_category(self, name):
        return Category.objects.create(name=name)

    # =========================================================
    # BASIC RESPONSE
    # =========================================================

    def test_category_list_returns_success(self):
        self.create_category("Shoes")

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_category_list_returns_categories(self):
        self.create_category("Shoes")
        self.create_category("Clothing")

        response = self.client.get(self.url)

        self.assertEqual(len(response.data), 2)

    # =========================================================
    # ORDERING
    # =========================================================

    def test_categories_are_ordered_by_name(self):
        self.create_category("Shoes")
        self.create_category("Accessories")
        self.create_category("Clothing")

        response = self.client.get(self.url)

        names = [
            category["name"]
            for category in response.data
        ]

        self.assertEqual(
            names,
            ["Accessories", "Clothing", "Shoes"],
        )


class CategoryDetailAPIViewTests(APITestCase):

    def setUp(self):
        self.category = Category.objects.create(
            name="Shoes",
        )

        self.url = reverse(
            "products:category_detail",
            kwargs={"slug": self.category.slug},
        )

    def create_product(self, **kwargs):
        defaults = {
            "sku": "SHOE-001",
            "name": "Running Shoe",
            "category": self.category,
            "price": Decimal("100.00"),
            "stock": 10,
            "available": True,
            "is_active": True,
            "featured": False,
            "description": "A running shoe",
        }

        defaults.update(kwargs)

        return Product.objects.create(**defaults)

    # =========================================================
    # BASIC RESPONSE
    # =========================================================

    def test_category_detail_returns_success(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_category_detail_returns_category(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.data["category"]["name"],
            "Shoes",
        )

    # =========================================================
    # PRODUCTS
    # =========================================================

    def test_category_detail_returns_products(self):
        self.create_product()

        response = self.client.get(self.url)

        products = response.data["products"]

        self.assertEqual(len(products), 1)
        self.assertEqual(
            products[0]["name"],
            "Running Shoe",
        )

    def test_inactive_product_is_not_returned(self):
        self.create_product()

        self.create_product(
            sku="SHOE-002",
            name="Inactive Shoe",
            is_active=False,
            available=False,
        )

        response = self.client.get(self.url)

        products = response.data["products"]

        self.assertEqual(len(products), 1)
        self.assertEqual(
            products[0]["name"],
            "Running Shoe",
        )

    def test_unavailable_product_is_not_returned(self):
        self.create_product()

        self.create_product(
            sku="SHOE-002",
            name="Unavailable Shoe",
            available=False,
            is_active=True,
        )

        response = self.client.get(self.url)

        products = response.data["products"]

        self.assertEqual(len(products), 1)
        self.assertEqual(
            products[0]["name"],
            "Running Shoe",
        )

    def test_products_from_other_categories_are_not_returned(self):
        self.create_product()

        other_category = Category.objects.create(
            name="Clothing",
        )

        Product.objects.create(
            sku="SHIRT-001",
            name="T-Shirt",
            category=other_category,
            price=Decimal("50.00"),
            stock=10,
            available=True,
            is_active=True,
        )

        response = self.client.get(self.url)

        products = response.data["products"]

        self.assertEqual(len(products), 1)
        self.assertEqual(
            products[0]["name"],
            "Running Shoe",
        )

    # =========================================================
    # NOT FOUND
    # =========================================================

    def test_nonexistent_category_returns_404(self):
        url = reverse(
            "products:category_detail",
            kwargs={"slug": "does-not-exist"},
        )

        response = self.client.get(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    # =========================================================
    # PAGINATION
    # =========================================================

    def test_category_products_are_paginated(self):
        for number in range(1, 26):
            self.create_product(
                sku=f"SHOE-{number:03d}",
                name=f"Running Shoe {number}",
            )

        response = self.client.get(
            self.url,
            {"page": 1},
        )

        self.assertEqual(
            len(response.data["products"]),
            20,
        )

    def test_category_pagination_metadata_is_correct(self):
        for number in range(1, 26):
            self.create_product(
                sku=f"SHOE-{number:03d}",
                name=f"Running Shoe {number}",
            )

        response = self.client.get(
            self.url,
            {"page": 1},
        )

        pagination = response.data["pagination"]

        self.assertEqual(pagination["page"], 1)
        self.assertEqual(pagination["page_size"], 20)
        self.assertEqual(pagination["total"], 25)
        self.assertEqual(pagination["total_pages"], 2)
        self.assertTrue(pagination["has_next"])
        self.assertFalse(pagination["has_previous"])

    # =========================================================
    # INVALID PAGINATION
    # =========================================================

    def test_invalid_page_returns_bad_request(self):
        response = self.client.get(
            self.url,
            {"page": 0},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )