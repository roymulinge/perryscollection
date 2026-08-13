import base64
from datetime import datetime

import requests
from django.conf import settings
from django.core.cache import cache


MPESA_BASE_URLS = {
    "sandbox": "https://sandbox.safaricom.co.ke",
    "production": "https://api.safaricom.co.ke",
}


def get_base_url():
    """
    Return the correct Safaricom API base URL.
    """

    environment = getattr(
        settings,
        "MPESA_ENV",
        "sandbox",
    )

    return MPESA_BASE_URLS.get(
        environment,
        MPESA_BASE_URLS["sandbox"],
    )


def get_access_token():
    """
    Get a Daraja OAuth access token.

    The token is cached so we don't request
    a new token for every M-Pesa operation.
    """

    cached_token = cache.get(
        "mpesa_access_token"
    )

    if cached_token:
        return cached_token

    consumer_key = settings.MPESA_CONSUMER_KEY
    consumer_secret = settings.MPESA_CONSUMER_SECRET

    credentials = (
        f"{consumer_key}:{consumer_secret}"
    ).encode("utf-8")

    encoded_credentials = base64.b64encode(
        credentials
    ).decode("utf-8")

    url = (
        f"{get_base_url()}"
        "/oauth/v1/generate"
        "?grant_type=client_credentials"
    )

    response = requests.get(
        url,
        headers={
            "Authorization": (
                f"Basic {encoded_credentials}"
            )
        },
        timeout=10,
    )

    print(
        "MPESA OAUTH STATUS:",
        response.status_code,
    )

    print(
        "MPESA OAUTH RESPONSE:",
        response.text,
    )

    response.raise_for_status()

    data = response.json()

    token = data.get("access_token")

    if not token:
        raise RuntimeError(
            "M-Pesa OAuth returned an empty access token."
        )

    print(
        "MPESA TOKEN RECEIVED:",
        bool(token),
    )

    print(
        "MPESA TOKEN LENGTH:",
        len(token),
    )

    cache.set(
        "mpesa_access_token",
        token,
        timeout=3500,
    )

    return token


def generate_password(timestamp):
    """
    Generate the Lipa Na M-Pesa Online password.

    Formula:

        Base64(
            BusinessShortCode
            + Passkey
            + Timestamp
        )
    """

    shortcode = settings.MPESA_SHORTCODE
    passkey = settings.MPESA_PASSKEY

    raw_password = (
        f"{shortcode}"
        f"{passkey}"
        f"{timestamp}"
    )

    return base64.b64encode(
        raw_password.encode("utf-8")
    ).decode("utf-8")


def format_phone_number(phone):
    """
    Normalize a Kenyan phone number to:

        2547XXXXXXXX

    Accepted examples:

        0712345678
        712345678
        +254712345678
        254712345678
    """

    if not phone:
        raise ValueError(
            "Phone number is required."
        )

    phone = (
        str(phone)
        .strip()
        .replace(" ", "")
        .replace("-", "")
    )

    if phone.startswith("+254"):
        return phone[1:]

    if phone.startswith("254"):
        return phone

    if phone.startswith("0"):
        return "254" + phone[1:]

    if phone.startswith("7") or phone.startswith("1"):
        return "254" + phone

    raise ValueError(
        "Invalid Kenyan phone number."
    )


def trigger_stk_push(
    *,
    phone_number,
    amount,
    order_id,
    callback_url,
):
    """
    Send an M-Pesa STK Push request.

    A successful STK Push response means Safaricom
    accepted the request.

    It does NOT mean the customer has successfully paid.

    Actual payment confirmation happens through
    the callback.
    """

    access_token = get_access_token()

    timestamp = datetime.now().strftime(
        "%Y%m%d%H%M%S"
    )

    password = generate_password(
        timestamp
    )

    formatted_phone = format_phone_number(
        phone_number
    )

    url = (
        f"{get_base_url()}"
        "/mpesa/stkpush/v1/processrequest"
    )

    payload = {
        "BusinessShortCode": (
            settings.MPESA_SHORTCODE
        ),
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": (
            "CustomerPayBillOnline"
        ),
        "Amount": int(amount),
        "PartyA": formatted_phone,
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": formatted_phone,
        "CallBackURL": callback_url,
        "AccountReference": (
            f"Order-{order_id}"
        ),
        "TransactionDesc": (
            f"Payment for "
            f"Perry's Collection "
            f"Order #{order_id}"
        ),
    }

    stk_headers = {
        "Authorization": (
            f"Bearer {access_token}"
        ),
        "Content-Type": "application/json",
    }

    print(
        "MPESA TOKEN USED FOR STK:",
        bool(access_token),
    )

    print(
        "MPESA TOKEN LENGTH USED:",
        len(access_token),
    )

    print(
        "MPESA AUTH HEADER PREFIX:",
        stk_headers["Authorization"][:7],
    )

    response = requests.post(
        url,
        json=payload,
        headers=stk_headers,
        timeout=15,
    )

    print(
        "MPESA STK STATUS:",
        response.status_code,
    )

    print(
        "MPESA STK RESPONSE:",
        response.text,
    )

    response.raise_for_status()

    return response.json()