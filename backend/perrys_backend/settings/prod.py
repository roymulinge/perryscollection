from dotenv import load_dotenv
from .base import *
import os
import dj_database_url

load_dotenv()

DEBUG = False

#Actual domain when deployed
ALLOWED_HOSTS =['perryscollection.onrender.com']


#PostgreSQL configuration via environment variables

DATABASES = {
    "default": dj_database_url.parse(
        os.environ["DATABASE_URL"]
    )
}

# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}

#Security settings for production
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

CORS_ALLOWED_ORIGINS =[
    'https://perryscollection-nine.vercel.app',#Vercel/Netlify Url
]
CSRF_TRUSTED_ORIGINS = [
    "https://perryscollection-nine.vercel.app",
]

CORS_ALLOW_CREDENTIALS = True

CACHES = {
    'default':{
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/1'),
    }
}