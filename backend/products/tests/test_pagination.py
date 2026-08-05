from django.test import SimpleTestCase
from django.core.exceptions import ValidationError

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request

from products.pagination import get_page_number


class GetPageNumberTests(SimpleTestCase):

    def setUp(self):
        self.factory = APIRequestFactory()

    def make_request(self, url):
        """
        APIRequestFactory creates a Django WSGIRequest.
        Wrap it in DRF Request so it has query_params.
        """
        django_request = self.factory.get(url)
        return Request(django_request)

    def test_page_defaults_to_one_when_not_provided(self):
        request = self.make_request('/products/')
        self.assertEqual(get_page_number(request), 1)

    def test_page_one_is_valid(self):
        request = self.make_request('/products/?page=1')
        self.assertEqual(get_page_number(request), 1)

    def test_page_two_is_valid(self):
        request = self.make_request('/products/?page=2')
        self.assertEqual(get_page_number(request), 2)

    def test_large_positive_page_is_valid(self):
        request = self.make_request('/products/?page=1000')
        self.assertEqual(get_page_number(request), 1000)

    def test_zero_is_invalid(self):
        request = self.make_request('/products/?page=0')

        with self.assertRaises(ValidationError):
            get_page_number(request)

    def test_negative_page_is_invalid(self):
        request = self.make_request('/products/?page=-1')

        with self.assertRaises(ValidationError):
            get_page_number(request)

    def test_non_integer_page_is_invalid(self):
        request = self.make_request('/products/?page=abc')

        with self.assertRaises(ValidationError):
            get_page_number(request)

    def test_empty_page_is_invalid(self):
        request = self.make_request('/products/?page=')

        with self.assertRaises(ValidationError):
            get_page_number(request)