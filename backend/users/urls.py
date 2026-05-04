from users.views import require_phone, post_login_redirect, home
from django.urls import path

urlpatterns = [
    path('require-phone/', require_phone, name='require_phone'),
     path('post-login/', post_login_redirect, name='post_login_redirect'),
     path('', home, name='home')
]