# users/views.py


from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from shopping_cart.utils import Cart

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

