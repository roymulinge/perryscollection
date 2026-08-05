from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from products.models import Category, Product


class CategoryModelTests(TestCase):

    def test_category_generates_slug(self):
        category = Category.objects.create(
            name="Men's Shoes"
        )

        self.assertEqual(category.slug, "mens-shoes")

    def test_category_name_must_be_unique(self):
        Category.objects.create(
            name="Shoes",
        )

        with self.assertRaises(IntegrityError):
            Category.objects.create(
                name="Shoes",
            )


class ProductModelTests(TestCase):

    def setUp(self):
        self.category = Category.objects.create(
            name="Shoes",
        )

    def create_product(self, **kwargs):
        defaults = {
            "sku": "SHOE-001",
            "name": "Running Shoe",
            "category": self.category,
            "price": Decimal("100.00"),
            "compare_at_price": Decimal("150.00"),
            "stock": 10,
            "low_stock_threshold": 5,
            "available": True,
            "is_active": True,
        }

        defaults.update(kwargs)

        return Product.objects.create(**defaults)

    # =========================================================
    # CREATION
    # =========================================================

    def test_product_can_be_created_with_valid_data(self):
        product = self.create_product()

        self.assertEqual(product.name, "Running Shoe")
        self.assertEqual(product.stock, 10)
        self.assertEqual(product.slug, "running-shoe")

    # =========================================================
    # UNIQUENESS
    # =========================================================

    def test_duplicate_sku_is_rejected(self):
        self.create_product()

        product = Product(
            sku="SHOE-001",
            name="Another Shoe",
            category=self.category,
            price=Decimal("100.00"),
            stock=10,
            available=True,
            is_active=True,
        )

        with self.assertRaises(ValidationError):
            product.full_clean()

    def test_duplicate_name_within_category_is_rejected(self):
        self.create_product()

        product = Product(
            sku="SHOE-002",
            name="Running Shoe",
            category=self.category,
            price=Decimal("100.00"),
            stock=10,
            available=True,
            is_active=True,
        )

        with self.assertRaises(ValidationError):
            product.full_clean()

    def test_same_product_name_in_different_category_is_allowed(self):
        self.create_product()

        another_category = Category.objects.create(
            name="Clothing",
        )

        product = self.create_product(
            sku="SHIRT-001",
            category=another_category,
        )

        self.assertEqual(product.name, "Running Shoe")
        self.assertEqual(product.category, another_category)

    # =========================================================
    # SLUG GENERATION
    # =========================================================

    def test_slug_is_generated_automatically(self):
        product = self.create_product()

        self.assertEqual(product.slug, "running-shoe")
    def test_duplicate_name_generates_unique_slug(self):
        self.create_product()

        second = self.create_product(
            sku="SHOE-002",
            name="Running Shoe",
            slug="",
            category=Category.objects.create(name="Clothing"),
        )

        self.assertEqual(second.slug, "running-shoe-2")

    def test_slug_collision_generates_unique_slug(self):
        first = self.create_product(
            name="Running Shoe",
            sku="SHOE-001",
        )

        second = self.create_product(
            name="Running-Shoe",
            sku="SHOE-002",
        )

        self.assertEqual(first.slug, "running-shoe")
        self.assertEqual(second.slug, "running-shoe-2")

        self.assertNotEqual(first.slug, second.slug)

    def test_multiple_slug_collisions_are_handled(self):
        self.create_product()

        clothing = Category.objects.create(name="Clothing")

        second = self.create_product(
            sku="SHOE-002",
            name="Running Shoe",
            slug="",
            category=clothing,
        )

        third = self.create_product(
            sku="SHOE-003",
            name="Running Shoe",
            slug="",
            category=Category.objects.create(name="Accessories"),
        )

        self.assertEqual(second.slug, "running-shoe-2")
        self.assertEqual(third.slug, "running-shoe-3")

        # =========================================================
    # INVENTORY VALIDATION
    # =========================================================

    def test_negative_stock_is_rejected(self):
        product = Product(
            sku="SHOE-002",
            name="Negative Stock Shoe",
            category=self.category,
            price=Decimal("100.00"),
            stock=-1,
            available=False,
            is_active=True,
        )

        with self.assertRaises(ValidationError):
            product.full_clean()

    def test_zero_stock_cannot_be_available(self):
        product = Product(
            sku="SHOE-002",
            name="Out Of Stock Shoe",
            category=self.category,
            price=Decimal("100.00"),
            stock=0,
            available=True,
            is_active=True,
        )

        with self.assertRaises(ValidationError):
            product.full_clean()

    def test_zero_stock_can_be_unavailable(self):
        product = Product(
            sku="SHOE-002",
            name="Out Of Stock Shoe",
            category=self.category,
            price=Decimal("100.00"),
            stock=0,
            available=False,
            is_active=True,
        )

        product.full_clean()

    def test_inactive_product_cannot_be_available(self):
        product = Product(
            sku="SHOE-002",
            name="Inactive Shoe",
            category=self.category,
            price=Decimal("100.00"),
            stock=10,
            available=True,
            is_active=False,
        )

        with self.assertRaises(ValidationError):
            product.full_clean()

    def test_inactive_product_can_be_unavailable(self):
        product = Product(
            sku="SHOE-002",
            name="Inactive Shoe",
            category=self.category,
            price=Decimal("100.00"),
            stock=10,
            available=False,
            is_active=False,
        )

        product.full_clean()

    # =========================================================
    # PRICE VALIDATION
    # =========================================================

    def test_compare_at_price_must_be_greater_than_price(self):
        product = Product(
            sku="SHOE-002",
            name="Discount Shoe",
            category=self.category,
            price=Decimal("100.00"),
            compare_at_price=Decimal("90.00"),
            stock=10,
            available=True,
            is_active=True,
        )

        with self.assertRaises(ValidationError):
            product.full_clean()

    def test_compare_at_price_equal_to_price_is_rejected(self):
        product = Product(
            sku="SHOE-002",
            name="Same Price Shoe",
            category=self.category,
            price=Decimal("100.00"),
            compare_at_price=Decimal("100.00"),
            stock=10,
            available=True,
            is_active=True,
        )

        with self.assertRaises(ValidationError):
            product.full_clean()

    def test_price_must_be_greater_than_zero(self):
        product = Product(
            sku="SHOE-002",
            name="Free Shoe",
            category=self.category,
            price=Decimal("0.00"),
            stock=10,
            available=True,
            is_active=True,
        )

        with self.assertRaises(ValidationError):
            product.full_clean()

    # =========================================================
    # COMPUTED PROPERTIES
    # =========================================================

    def test_in_stock_is_calculated_correctly(self):
        product = self.create_product(
            stock=10,
            available=True,
        )

        self.assertTrue(product.in_stock)

        product.stock = 0

        self.assertFalse(product.in_stock)

    def test_unavailable_product_is_not_in_stock(self):
        product = self.create_product(
            stock=10,
            available=False,
        )

        self.assertFalse(product.in_stock)

    def test_low_stock_status_is_calculated_correctly(self):
        product = self.create_product(
            stock=5,
            low_stock_threshold=5,
        )

        self.assertTrue(product.is_low_stock)

        product.stock = 10

        self.assertFalse(product.is_low_stock)

    def test_zero_stock_is_low_stock(self):
        product = self.create_product(
            stock=0,
            available=False,
        )

        self.assertTrue(product.is_low_stock)

    # =========================================================
    # STOCK VALUE
    # =========================================================

    def test_stock_value_is_calculated_correctly(self):
        product = self.create_product(
            price=Decimal("100.00"),
            stock=10,
        )

        self.assertEqual(
            product.stock_value,
            Decimal("1000.00"),
        )