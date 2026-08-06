from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from users.models import Profile

User = get_user_model()

class RegisterAPIViewTests(APITestCase):

    def setUp(self):
        self.url = reverse("register")

    def test_user_can_register(self):
        payload = {
            "email": "roy@example.com",
            "full_name": "Roy Mutua",
            "password": "StrongPassword123",
            "password2": "StrongPassword123",
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)

        user = User.objects.first()

        self.assertEqual(user.email, payload["email"])
        self.assertEqual(user.full_name, payload["full_name"])
        self.assertTrue(user.check_password(payload["password"]))

        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)

    def test_cannot_register_with_duplicate_email(self):
        User.objects.create_user(
            email="roy@example.com",
            full_name="Existing User",
            password="StrongPassword123",
        )

        payload = {
            "email": "roy@example.com",
            "full_name": "Another User",
            "password": "StrongPassword123",
            "password2": "StrongPassword123",
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 1)
        self.assertIn("email", response.data)

    def test_passwords_must_match(self):
        payload = {
            "email": "roy@example.com",
            "full_name": "Roy Mutua",
            "password": "StrongPassword123",
            "password2": "DifferentPassword123",
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

        self.assertIn("password2", response.data)

    def test_email_is_required(self):
        payload = {
            "email": "",
            "full_name": "Roy Mutua",
            "password": "StrongPassword123",
            "password2": "StrongPassword123",
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

        self.assertIn("email", response.data)

    def test_password_must_be_at_least_8_characters(self):
        payload = {
            "email": "roy@example.com",
            "full_name": "Roy Mutua",
            "password": "1234567",
            "password2": "1234567",
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

        self.assertIn("password", response.data)

    def test_profile_is_created_when_user_registers(self):
        payload = {
            "email": "roy@example.com",
            "full_name": "Roy Mutua",
            "password": "StrongPassword123",
            "password2": "StrongPassword123",
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(email="roy@example.com")

        self.assertTrue(
            Profile.objects.filter(user=user).exists()
        )

        profile = Profile.objects.get(user=user)
        self.assertEqual(profile.user, user)
    def test_registration_response_does_not_include_password(self):
        payload = {
            "email": "roy@example.com",
            "full_name": "Roy Mutua",
            "password": "StrongPassword123",
            "password2": "StrongPassword123",
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertNotIn("password", response.data)
        self.assertNotIn("password2", response.data)

        self.assertIn("user", response.data)