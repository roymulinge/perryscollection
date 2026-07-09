# users/views.py


from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from shopping_cart.utils import Cart
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.contrib.auth import get_user_model

# RefreshToken is how simplejwt generates token pairs:
# RefreshToken.for_user(user) → gives you both access and refresh tokens

from .serializers import RegisterSerializer, UserSerializer, ProfileUpdateSerializer
from .models import Profile


class RegisterAPIView(APIView):
    """
    POST /api/auth/register/
    Open to everyone — this is how new users sign up.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if not serializer.is_valid():
            # Return all validation errors so React can show field-level feedback
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()  # calls RegisterSerializer.create()

        # Generate JWT tokens immediately on registration —
        # so the user is logged in right away without a separate login step
        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class LoginAPIView(APIView):
    """
    POST /api/auth/login/
    Returns JWT tokens on valid credentials.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')

        # We can't use Django's authenticate() directly with email
        # because it defaults to username. We look up the user manually.
        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Same error for wrong email or wrong password — don't reveal which
            return Response(
                {'error': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # check_password() compares plain text against the hashed password
        if not user.check_password(password):
            return Response(
                {'error': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': 'This account has been disabled.'},
                status=status.HTTP_403_FORBIDDEN
            )
        pre_login_cart_data = dict(request.session.get('cart', {}))

        refresh = RefreshToken.for_user(user)
     
        if pre_login_cart_data:
            request.session['cart'] = pre_login_cart_data
            request.session.modified = True

        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class MeAPIView(APIView):
    """
    GET /api/auth/me/
    Returns the currently logged-in user's profile.
    React calls this on app load to rehydrate the auth state.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # request.user is automatically populated by simplejwt
        # when a valid Authorization: Bearer <token> header is sent
        return Response(UserSerializer(request.user).data)


# ── Keep your existing template-based views below ──
# (these can be removed once you're fully on React)

class ProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):

        Profile.objects.get_or_create(
            user=request.user,
            defaults = {'name': request.user.full_name}
        )
        return Response(UserSerializer(request.user).data)
    

    def patch(self, request):
        profile, created = Profile.objects.get_or_create(user=request.user)

        serializer = ProfileUpdateSerializer(
            instance=profile,
            data=request.data,
            partial=True,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save()

        return Response(UserSerializer(request.user).data)

class GoogleAuthAPIView(APIView):
    """
    post /api/auth/google/
    Accecpts Google ID token from react(obtanied via google sig-in SDK)
    verifies it with google's server,finds or create the local user 
    and returns my own JWT pair excatly like LoginAPIView does 
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # get credetials from google sent to react 
        # containing the users, name, email and google user ID

        credential =  request.data.get('credential')

        if not credential:
            return Response(
                {'error': 'Google credential is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            #verify the credential with google's keys 
            #id_token.verify_oauth2_token() does three things:
            # 1. Fetches Google's Public keys(cached automatically)
            # 2.Verifies the cryptographic signature
            # 3 checkes token hasn't expired

            google_client_id = settings.GOOGLE_CLIENT_ID
            id_info = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                google_client_id
            )
        except ValueError as e:
            return Response(
                {'error': 'Invalid Google token. Please try again'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        #Extract user info from the verified token 
        #email belongs to user who clicked sign in with google
        
        email = id_info.get('email')
        full_name = id_info.get('name', '')
        google_id = id_info.get('sub')

        if not email:
            return Response(
                {'error': 'Could nor retrieve email from google account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find or create the local user

        User = get_user_model()
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'full_name': full_name,
                'is_active': True
            }
        )
        if created:
            #set unusable password so they can't accidentally login with an empty password
            user.set_unusable_password()
            user.save(update_fields=['password'])

        refresh = RefreshToken.for_user(user)
     
        return Response(
            {'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            }
        )