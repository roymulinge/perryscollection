# users/views.py

from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
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
from django.core.mail import send_mail
from django.conf import settings as django_settings
from .models import PasswordResetCode
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

@method_decorator(
    ratelimit(key='ip', rate='5/m', method='POST', block=True),
    name='dispatch'
)
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
@method_decorator(
    ratelimit(key='ip', rate='3/m', method='POST', block=True),
    name='dispatch'
)
class ForgotPasswordAPIView(APIView):
    """
    POST /api/auth/forgot-password/
    Body: { "email": "user@example.com" }

    Generates a 6-digit code, saves it to DB, emails it to the user.
    Always returns 200 even if email doesn't exist — this prevents
    user enumeration attacks (attacker can't tell which emails are
    registered by watching for 404 vs 200 responses).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()

        if not email:
            return Response(
                {'error': 'Email is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # SECURITY: don't reveal whether email exists
        # Return 200 regardless — "if this email exists, you'll get a code"
        try:
            User = get_user_model()
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Deliberately vague — don't tell attacker this email isn't registered
            return Response({
                'message': 'If this email is registered, you will receive a reset code.'
            })

        # Invalidate any previous unused codes for this user
        # Prevents someone from requesting 100 codes and brute-forcing them all
        PasswordResetCode.objects.filter(
            user=user,
            is_used=False
        ).update(is_used=True)

        # Generate and save the new code
        code = PasswordResetCode.generate_code()
        PasswordResetCode.objects.create(user=user, code=code)

        # Send email using Django's send_mail — reads EMAIL_* settings
        # from dev.py (your Gmail SMTP config)
        try:
            send_mail(
                subject="Perry's Collection — Password Reset Code",
                message=f"""
                    Hi {user.full_name or user.email},

                    Your password reset code is:

                        {code}

                    This code expires in 10 minutes.
                    If you didn't request this, ignore this email — your account is safe.

                    Perry's Collection
                """.strip(),
                from_email=django_settings.EMAIL_HOST_USER,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as e:
            # Email failed — log it but don't expose details to client
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send reset email to {email}: {e}")
            return Response(
                {'error': 'Failed to send email. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            'message': 'If this email is registered, you will receive a reset code.'
        })

@method_decorator(
    ratelimit(key='ip', rate='3/m', method='POST', block=True),
    name='dispatch'
)
class VerifyResetCodeAPIView(APIView):
    """
    POST /api/auth/verify-reset-code/
    Body: { "email": "user@example.com", "code": "123456" }

    Verifies the code is valid, not expired, and not already used.
    Returns a temporary token the frontend uses to prove it passed
    this step before calling reset-password/.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        code = request.data.get('code', '').strip()

        if not email or not code:
            return Response(
                {'error': 'Email and code are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        User = get_user_model()
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Same vague message — don't reveal which emails exist
            return Response(
                {'error': 'Invalid code.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find the most recent unused code for this user
        try:
            reset_code = PasswordResetCode.objects.filter(
                user=user,
                is_used=False
            ).latest('created_at')
            # latest('created_at') gets the most recent row —
            # equivalent to ORDER BY created_at DESC LIMIT 1
        except PasswordResetCode.DoesNotExist:
            return Response(
                {'error': 'Invalid code.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check expired
        if reset_code.is_expired():
            return Response(
                {'error': 'This code has expired. Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check matches
        if reset_code.code != code:
            return Response(
                {'error': 'Invalid code.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Code is valid — mark it used so it can't be reused
        reset_code.is_used = True
        reset_code.save(update_fields=['is_used'])

        # Generate a short-lived token the frontend carries to the
        # reset-password step as proof it passed code verification.
        # We use simplejwt's RefreshToken as a convenient signed token —
        # it's already in your stack, it expires, it can't be forged.
        # We add a custom claim 'password_reset': True so the
        # reset-password view can verify this token was issued specifically
        # for password reset, not as a regular login token.
        from rest_framework_simplejwt.tokens import RefreshToken as RT
        from datetime import timedelta

        token = RT.for_user(user)
        token.set_exp(lifetime=timedelta(minutes=15))
        token['password_reset'] = True  # custom claim

        return Response({
            'reset_token': str(token.access_token),
            'message': 'Code verified. You may now reset your password.'
        })


class ResetPasswordAPIView(APIView):
    """
    POST /api/auth/reset-password/
    Body: {
        "reset_token": "<token from verify-reset-code>",
        "password": "newpassword123",
        "password2": "newpassword123"
    }

    Verifies the reset token, then sets the new password.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        reset_token = request.data.get('reset_token', '')
        password = request.data.get('password', '')
        password2 = request.data.get('password2', '')

        if not reset_token or not password or not password2:
            return Response(
                {'error': 'Reset token and both password fields are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if password != password2:
            return Response(
                {'error': 'Passwords do not match.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify the reset token is valid and has the password_reset claim
        from rest_framework_simplejwt.tokens import AccessToken
        from rest_framework_simplejwt.exceptions import TokenError

        try:
            token = AccessToken(reset_token)
            # Check this is a password reset token, not a regular login token
            if not token.get('password_reset'):
                raise TokenError('Invalid token type.')
            user_id = token['user_id']
        except TokenError:
            return Response(
                {'error': 'Invalid or expired reset token. Please start over.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        User = get_user_model()
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # set_password() hashes the password — never store plain text
        user.set_password(password)
        user.save(update_fields=['password'])

        return Response({
            'message': 'Password reset successfully. You can now log in.'
        })