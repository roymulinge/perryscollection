# products/permissions.py
# ─────────────────────────────────────────────────────────────────
# Custom DRF permission classes.
#
# HOW DRF PERMISSIONS WORK:
# When a request hits a view, DRF checks each permission class in
# the view's permission_classes list. If ANY class returns False
# from has_permission(), DRF returns 403 Forbidden immediately.
#
# We define our own here instead of using DRF's built-in IsAdminUser
# because we want to allow BOTH is_staff AND is_shop_owner users —
# DRF's built-in only checks is_staff.
# ─────────────────────────────────────────────────────────────────

from rest_framework.permissions import BasePermission


class IsShopAdmin(BasePermission):
    """
    Grants access to users who are either:
      - is_staff=True  (Django superusers and staff)
      - is_shop_owner=True (your custom field on CustomUser)

    This permission is applied to ALL admin API views below.
    Regular customers get 403 Forbidden if they try to hit these endpoints.
    """

    # message is what DRF sends back in the 403 response body
    message = "You do not have permission to access the admin panel."

    def has_permission(self, request, view):
        # request.user is populated by JWTAuthentication from client.js
        # If the token is missing or invalid, request.user is AnonymousUser
        # and is_authenticated returns False → we return False → 403

        return bool(
            request.user                        # user exists
            and request.user.is_authenticated   # valid JWT token
            and (
                request.user.is_staff           # Django staff flag
                or request.user.is_shop_owner   # your custom flag
            )
        )