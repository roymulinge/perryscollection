from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from .services import CartService
from .serializers import (
    CartSerializer,
    AddToCartSerializer,
    UpdateCartItemSerializer,
)


def get_session_id(request):
    """
    Return the current Django session ID.

    Guests require a session.

    If Django has not created one yet,
    create it here.
    """

    if not request.session.session_key:
        request.session.create()

    return request.session.session_key


def get_cart_for_request(request):
    """
    Resolve the cart belonging to this request.

    Authenticated user:
        use the user's active cart.

    Guest:
        use the cart belonging to the current session.

    If an authenticated user has a guest cart
    associated with the current session, merge it
    into the user's cart.
    """

    # -------------------------------------------------------------
    # AUTHENTICATED USER
    # -------------------------------------------------------------

    if request.user.is_authenticated:

        session_id = request.session.session_key

        if session_id:
            return CartService.merge_guest_cart(
                user=request.user,
                session_id=session_id,
            )

        return CartService.get_or_create_cart(
            user=request.user,
        )

    # -------------------------------------------------------------
    # GUEST
    # -------------------------------------------------------------

    session_id = get_session_id(request)

    return CartService.get_or_create_cart(
        session_id=session_id,
    )


def serialize_cart(cart, request):
    """
    Return the standard cart representation.
    """

    serializer = CartSerializer(
        cart,
        context={
            "request": request,
        },
    )

    return serializer.data


class CartAPIView(APIView):
    """
    GET /api/cart/

        Return the current cart.

    DELETE /api/cart/

        Remove all items from the current cart.
    """

    permission_classes = [AllowAny]

    def get(self, request):

        cart = get_cart_for_request(request)

        return Response(
            serialize_cart(
                cart,
                request,
            ),
            status=status.HTTP_200_OK,
        )

    def delete(self, request):

        cart = get_cart_for_request(request)

        CartService.clear_cart(
            cart=cart,
        )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class CartAddAPIView(APIView):
    """
    POST /api/cart/items/

    Add a product to the current cart.
    """

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = AddToCartSerializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        cart = get_cart_for_request(request)

        CartService.add_item(
            cart=cart,
            product_id=serializer.validated_data[
                "product_id"
            ],
            quantity=serializer.validated_data[
                "quantity"
            ],
        )

        return Response(
            serialize_cart(
                cart,
                request,
            ),
            status=status.HTTP_200_OK,
        )


class CartUpdateAPIView(APIView):
    """
    PATCH /api/cart/items/<product_id>/

    Update the quantity of a product.

    quantity = 0 removes the item.
    """

    permission_classes = [AllowAny]

    def patch(
        self,
        request,
        product_id,
    ):

        serializer = UpdateCartItemSerializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        cart = get_cart_for_request(request)

        CartService.update_item(
            cart=cart,
            product_id=product_id,
            quantity=serializer.validated_data[
                "quantity"
            ],
        )

        return Response(
            serialize_cart(
                cart,
                request,
            ),
            status=status.HTTP_200_OK,
        )


class CartRemoveAPIView(APIView):
    """
    DELETE /api/cart/items/<product_id>/

    Remove one product from the current cart.
    """

    permission_classes = [AllowAny]

    def delete(
        self,
        request,
        product_id,
    ):

        cart = get_cart_for_request(request)

        CartService.remove_item(
            cart=cart,
            product_id=product_id,
        )

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )