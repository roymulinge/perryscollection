# users/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """
    Validates registration data from React.
    We add password2 (confirm password) — it's NOT a model field,
    so we declare it manually as write_only.
    write_only=True means it will never appear in the response JSON.
    """
    password = serializers.CharField(write_only=True, min_length=8)
    # write_only: sent in, never sent back — security practice
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        # Only expose these fields — never expose is_staff, is_superuser etc.
        fields = ['email', 'full_name', 'password', 'password2']

    def validate(self, data):
        # Cross-field validation: both passwords must match
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return data

    def create(self, validated_data):
        # Pop password2 — it's not a model field, don't pass it to create_user
        validated_data.pop('password2')
        # create_user hashes the password — never store plain text
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    """
    Safe read-only representation of a user.
    Used to return user info after login or on /me/ endpoint.
    """
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'is_staff',       # ← ADDED: AdminLayout needs this
            'is_superuser',   # ← ADDED: useful for future checks
            'is_shop_owner',  # custom field on CustomUser
            'date_joined',
        ]
        read_only_fields = fields