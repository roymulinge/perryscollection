from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product


class ProductListAPIViewTests(APITestCase):

    def setUp(self):
        self.category = Category.objects.create(
            name="Shoes"
        )

        self.url = reverse("products:product_list")

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

    def test_product_list_returns_success(self):
        self.create_product()

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_product_list_returns_products(self):
        self.create_product()

        response = self.client.get(self.url)

        self.assertEqual(
            len(response.data["products"]),
            1,
        )

    # =========================================================
    # VISIBILITY
    # =========================================================

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
        self.assertEqual(products[0]["name"], "Running Shoe")

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
        self.assertEqual(products[0]["name"], "Running Shoe")

    # =========================================================
    # FEATURED FILTER
    # =========================================================

    def test_featured_filter_returns_only_featured_products(self):
        self.create_product(
            sku="SHOE-001",
            name="Featured Shoe",
            featured=True,
        )

        self.create_product(
            sku="SHOE-002",
            name="Normal Shoe",
            featured=False,
        )

        response = self.client.get(
            self.url,
            {"featured": "true"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        products = response.data["products"]

        self.assertEqual(len(products), 1)
        self.assertEqual(products[0]["name"], "Featured Shoe")

    # =========================================================
    # SEARCH
    # =========================================================

    def test_search_finds_product_by_name(self):
        self.create_product(
            sku="SHOE-001",
            name="Running Shoe",
        )

        self.create_product(
            sku="SHOE-002",
            name="Formal Boot",
        )

        response = self.client.get(
            self.url,
            {"q": "Running"},
        )

        products = response.data["products"]

        self.assertEqual(len(products), 1)
        self.assertEqual(products[0]["name"], "Running Shoe")

    def test_search_finds_product_by_sku(self):
        self.create_product(
            sku="RUN-001",
            name="Running Shoe",
        )

        self.create_product(
            sku="FORMAL-001",
            name="Formal Boot",
        )

        response = self.client.get(
            self.url,
            {"q": "RUN-001"},
        )

        products = response.data["products"]

        self.assertEqual(len(products), 1)
        self.assertEqual(products[0]["sku"], "RUN-001")

    def test_search_finds_product_by_name(self):
        self.create_product(
            sku="SHOE-001",
            name="Running Shoe",
            description="A running shoe",
        )

        self.create_product(
            sku="SHOE-002",
            name="Formal Boot",
            description="A formal leather boot",
        )

        response = self.client.get(
            self.url,
            {"q": "Running"},
        )

        products = response.data["products"]

        self.assertEqual(len(products), 1)
        self.assertEqual(products[0]["name"], "Running Shoe")

    # =========================================================
    # PAGINATION
    # =========================================================

    def test_first_page_returns_24_products(self):
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
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data["products"]),
            24,
        )

    def test_second_page_returns_remaining_products(self):
        for number in range(1, 26):
            self.create_product(
                sku=f"SHOE-{number:03d}",
                name=f"Running Shoe {number}",
            )

        response = self.client.get(
            self.url,
            {"page": 2},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data["products"]),
            1,
        )

    def test_pagination_metadata_is_correct(self):
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
        self.assertEqual(pagination["page_size"], 24)
        self.assertEqual(pagination["total"], 25)
        self.assertEqual(pagination["total_pages"], 2)
        self.assertTrue(pagination["has_next"])
        self.assertFalse(pagination["has_previous"])

    # =========================================================
    # INVALID PAGINATION
    # =========================================================

    def test_zero_page_returns_bad_request(self):
        response = self.client.get(
            self.url,
            {"page": 0},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_negative_page_returns_bad_request(self):
        response = self.client.get(
            self.url,
            {"page": -1},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_non_integer_page_returns_bad_request(self):
        response = self.client.get(
            self.url,
            {"page": "abc"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    # =========================================================
    # FILTER + PAGINATION
    # =========================================================

    def test_featured_filter_and_pagination_work_together(self):
        for number in range(1, 26):
            self.create_product(
                sku=f"FEATURED-{number:03d}",
                name=f"Featured Shoe {number}",
                featured=True,
            )

        self.create_product(
            sku="NORMAL-001",
            name="Normal Shoe",
            featured=False,
        )

        response = self.client.get(
            self.url,
            {
                "featured": "true",
                "page": 2,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data["products"]),
            1,
        )

        self.assertEqual(
            response.data["pagination"]["total"],
            25,
        )