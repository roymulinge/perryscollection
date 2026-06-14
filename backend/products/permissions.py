# products/permissions.py
# ─────────────────────────────────────────────────────────────────
# Custom DRF permission classes.
#
# HOW DRF PERMISSIONS WORK:
# DRF checks each class in a view's permission_classes list.
# If has_permission() returns False → 403 Forbidden immediately.
# The request never reaches your view code.
#
# WHY TWO NAMES?
# We built IsShopAdmin in the admin panel session.
# The inventory_agent app (built separately) imports IsShopOwner.
# Rather than rename one and break the other, we define the class
# once and export it under BOTH names at the bottom.
# This is a standard Python aliasing pattern.
# ─────────────────────────────────────────────────────────────────

from rest_framework.permissions import BasePermission


class IsShopAdmin(BasePermission):
    """
    Grants access to users who are either:
      - is_staff=True      (Django staff/superusers)
      - is_shop_owner=True (your custom field on CustomUser)

    Both flags give the same access level for this shop.
    A "shop owner" IS an admin and vice versa.
    """

    # message: what DRF puts in the 403 response body.
    # The frontend can read this and show it to the user.
    message = "You do not have permission to access this area."

    def has_permission(self, request, view):
        # Break this down line by line:
        # request.user         → the user object (or AnonymousUser if no token)
        # request.user.is_authenticated → False for AnonymousUser (no valid JWT)
        # request.user.is_staff        → True if created with createsuperuser
        # request.user.is_shop_owner   → your custom boolean field on CustomUser
        #
        # bool() converts the whole expression to True/False cleanly.
        # The `and` chain short-circuits: if user is not authenticated,
        # Python never even checks is_staff or is_shop_owner.
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.is_staff
                or request.user.is_shop_owner
            )
        )


# ── Alias ─────────────────────────────────────────────────────────
# IsShopOwner is the SAME class as IsShopAdmin, just a second name.
# inventory_agent/views.py imports IsShopOwner.
# admin_views.py imports IsShopAdmin.
# Both work. Both check the same thing.
# This is called an "alias" — one object, two variable names.
IsShopOwner = IsShopAdmin