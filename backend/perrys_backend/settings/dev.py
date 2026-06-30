from .base import *
import os
from dotenv import load_dotenv

load_dotenv()  # Loads .env in development as well

DEBUG = True
ALLOWED_HOSTS = [ 'localhost', '127.0.0.1']   # ← note: ALLOWED_HOSTS (plural)

#Email config
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST= os.environ.get('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS= os.environ.get('EMAIL_USE_TLS', "True") == "True"
EMAIL_USE_SSL= os.environ.get('EMAIL_USE_SSL', "False" ) == "True"
EMAIL_HOST_USER=os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')

#500 errors
ADMINS = [('Roy', 'roymutua6@gmail.com')]
MANAGERS = ADMINS
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

CORS_ALLOWED_ORIGINS = [

    
    'http://localhost:5174',   # ← add this as a safety net in case Vite bumps again
    'http://localhost:5173',
]

# Which HTTP methods are allowed cross-origin.
# Default is already fine but being explicit is good practice.
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',   # ← the preflight request uses OPTIONS
    'PATCH',
    'POST',
    'PUT',
]

# Which request headers the browser is allowed to send cross-origin.
#Authorization is the important one - that's my JWT Bearer token.

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnf',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
CORS_ALLOW_CREDENTIALS = True

SESSION_ENGINE = 'django.contrib.sessions.backends.db'  # explicit is safer
SESSION_COOKIE_NAME = 'sessionid'
SESSION_COOKIE_DOMAIN = None  

SESSION_COOKIE_SAMESITE = 'Lax'   # allows the cookie on top-level navigation and most XHR
SESSION_COOKIE_SECURE = False 
SESSION_COOKIE_HTTPONLY = True      # MUST be False on plain http:// in development
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = False