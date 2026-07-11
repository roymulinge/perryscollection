from django.db import models
import random
# Create your models here.
from .managers import CustomUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.conf import settings
class CustomUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    username = models.CharField(unique=True, max_length=150, blank=True, null=True)
    phone_number = models.CharField(max_length=15, blank=True, default='')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    is_email_verified = models.BooleanField(default=False)
    full_name = models.CharField(max_length=255, blank=True, default='')
    is_shop_owner = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email
    
    def get_full_name(self):
        return self.full_name or self.email
    
    def get_short_name(self):
        return self.email


class Profile(models.Model):
    GENDER_CHOICES=[
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
        ('prefer_not_to_say', 'Prefer not to say'),
    ]


    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
    )


    full_name = models.CharField(max_length=255, blank=True, default='')
    username = models.CharField(max_length=150, unique=True, blank=True, null=True)
    bio = models.TextField(blank=True, default='')
    profile_pic = models.ImageField(upload_to='profiles/%Y/%m/', blank=True, null=True)
    phone_number = models.CharField(max_length=15, blank=True, default='')
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name or self.user.email
    
class PasswordResetCode(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name = "reset_code"
    )

    code = models.CharField(max_length=6)
    
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def is_expired(self):
        from django.utils import timezone
        from datetime import timedelta

        return timezone.now() > self.created_at + timedelta(minutes=10)
    
    @classmethod
    def generate_code(cls):
        # 6-digit code: 000000 to 999999
        # zfill(6) pads with leading zeros so '1234' becomes '001234'
        return str(random.randint(0, 999999)).zfill(6)

    def __str__(self):
        return f"Reset code for {self.user.email} ({'used' if self.is_used else 'active'})"