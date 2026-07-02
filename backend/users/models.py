from django.db import models

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
