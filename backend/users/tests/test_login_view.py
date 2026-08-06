# users/tests/test_login_view.py

from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()


class LoginAPIViewTests(APITestCase):

    def setUp(self):
        self.url = reverse("login")

        self.password = "StrongPassword123!"

        self.user = User.objects.create_user(
            email="roy@example.com",
            password=self.password,
            full_name="Roy Mutua",
        )

    def test_user_can_login_with_valid_credentials(self):
        """
        A registered user should receive JWT tokens.
        """

        response = self.client.post(
            self.url,
            {
                "email": "roy@example.com",
                "password": self.password,
            },
            format="json",
        )
        print(response.status_code)
        print(response.data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)

        self.assertEqual(
            response.data["user"]["email"],
            "roy@example.com",
        )

    def test_login_fails_with_wrong_password(self):
        """
        Wrong password should return 401.
        """

        response = self.client.post(
            self.url,
            {
                "email": "roy@example.com",
                "password": "WrongPassword123",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.assertEqual(
            response.data["error"],
            "Invalid email or password.",
        )

    def test_login_fails_with_unknown_email(self):
        """
        Unknown email should return 401.
        """

        response = self.client.post(
            self.url,
            {
                "email": "unknown@example.com",
                "password": self.password,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.assertEqual(
            response.data["error"],
            "Invalid email or password.",
        )

    def test_inactive_user_cannot_login(self):
        self.user.is_active = False
        self.user.save()

        response = self.client.post(
            self.url,
            {
                "email": "roy@example.com",
                "password": self.password,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.assertEqual(
            response.data["error"],
            "Invalid email or password.",
        )

    def test_email_is_case_insensitive(self):
        """
        Login should normalize email casing.
        """

        response = self.client.post(
            self.url,
            {
                "email": "ROY@EXAMPLE.COM",
                "password": self.password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_email_is_trimmed(self):
        """
        Leading/trailing spaces should be ignored.
        """

        response = self.client.post(
            self.url,
            {
                "email": "   roy@example.com   ",
                "password": self.password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)