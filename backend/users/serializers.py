# users/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Profile
User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """
    Validates registration data from React.
    We add password2 (confirm password) — it's NOT a model field,
    so we declare it manually as write_only.
    write_only=True means it will never appear in the response JSON.
    """
    password = serializers.CharField(write_only=True, min_length=8)
   
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
    
    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        Profile.objects.create(user=user)
        return user

class ProfileSerializer(serializers.ModelSerializer):
   class Meta:
       model =Profile
       fields = ['full_name','username', 'bio', 'profile_pic', 'phone_number', 'gender']
class UserSerializer(serializers.ModelSerializer):
    """
    Safe read-only representation of a user.
    Used to return user info after login or on /me/ endpoint.
    """

    profile = ProfileSerializer(read_only=True)
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'is_staff',       # ← ADDED: AdminLayout needs this
            'is_superuser',   # ← ADDED: useful for future checks
            'is_shop_owner',
             'profile',  # custom field on CustomUser
            'date_joined',
        ]
        read_only_fields = ['id', 'email', 'full_name', 'is_staff', 'is_superuser', 'is_shop_owner', 'date_joined']

class ProfileUpdateSerializer(serializers.ModelSerializer):

    full_name = serializers.CharField(
        source ='user.full_name',
        required = False,
        allow_blank =True
    )
    class Meta:
        model = Profile
        fields = [
          
          'full_name',
          'bio',
          'phone_number',
          'gender',
          'username',
          'profile_pic',

        ]
    def validate_username(self, value):
        if value and Profile.objects.exclude(pk=self.instance.pk).filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken")
        return value
    
    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data and 'full_name' in user_data:
            instance.user.full_name = user_data['full_name']
            instance.user.save(update_fields=['full_name'])
        return super().update(instance, validated_data)