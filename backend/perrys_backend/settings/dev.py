from .base import *
import os
from dotenv import load_dotenv

load_dotenv()  # Loads .env in development as well

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1']   # ← note: ALLOWED_HOSTS (plural)

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'perrys_db'),      # fallback to your dev DB name
        'USER': os.environ.get('DB_USER', 'ROY'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'Destroy$6978'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

CORS_ALLOWED_ORIGINS = ['http://localhost:5173']