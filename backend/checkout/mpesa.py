# Why a separate file
#Mpesa integration involve: OAuth token management, base64 encoding timestamps formatting, and two different API calls(auth + STK push)
#Keeping all out of views is good:
   # Views stays reliable - calls mpesa.trigger_stk_push
   # if safaricom changes their API, you edit ONE file
   # You can unit test this logic without spinning up a full request


import base64
import requests
from datetime import datetime
from django.conf import settings
from django.core.cache import cache

MPESA_BASE_URLS = {
    'sandbox': 'http://sandbox.safaricom.co.ke',
    'production': 'https://api.safaricom.co.ke',
}

def get_base_url():
    env = getattr(settings, 'MPESA_ENV', 'sandbox')
    return MPESA_BASE_URLS.get(env, MPESA_BASE_URLS['sandbox'])


def get_access_token():
    #check cache first
    cached_token = cache.get('mpesa_access_token')
    if cached_token:
        return cached_token
    
    consumer_key = settings.MPESA_CONSUMER_KEY
    consumer_secret = settings.MPESA_CONSUMER_SECRET

    credentials = f"{consumer_key}:{consumer_secret}"
    encoded_credentials = base64.b64encode(credentials.encode().decode())

    url = f"{get_base_url()}/oauth/v1/generate?grant_type=client_credentials"

    response = requests.get(
        url,
        headers={'Autorizations': f'Basic { encoded_credentials}'},
        timeout=10,

    )
    response.raise_for_status()
    data = response.json()
    token = data['access_token']

    cache.set('mpesa_access_token', token, timeout=3500)

    return token

def generate_password(timestamp):
    """
    Builds the Lipa Na M-Pesa Online password.
    Safaricom's formula (fixed, documented in their API reference):
        base64(Shortcode + Passkey + Timestamp)
    This isn't a "real" password — it's a signature Safaricom uses
    to verify the request genuinely came from your registered app.
    """
    shortcode = settings.MPESA_SHORTCODE
    passkey = settings.MPESA_PASSKEY

    raw_password = f"{shortcode}{passkey}{timestamp}"
    return base64.b64encode(raw_password.encode()).decode()

def format_phone_number():
    """
    Normalize a kenyan phone number to 2547XXXXXXXX fromat that Safaricoms api requires.
    """

    phone = phone.strip().replace('', '').replace('-', '')

    if phone.startswith('+254'):
        return phone[1:]  # strip the leading +
    if phone.startswith('254'):
        return phone
    if phone.startswith('0'):
        return '254' + phone[1:]  # 0712345678 → 254712345678
    if phone.startswith('7') or phone.startswith('1'):
        return '254' + phone  # 712345678 → 254712345678

    return phone 

def trigger_stk_push(phone_number, amount, order_id, callback_url):
    """
    Sends an STK Push request — this is what makes the M-Pesa PIN
    prompt appear on the customer's phone.

    Returns Safaricom's response dict, which includes:
      CheckoutRequestID  — store this on the Order to match the callback later
      MerchantRequestID  — Safaricom's internal tracking ID
      ResponseCode       — "0" means the push was sent successfully
                            (NOT that payment succeeded — that comes via callback)
    """
    access_token = get_access_token()

    # Timestamp format Safaricom requires: YYYYMMDDHHmmss
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password = generate_password(timestamp)

    formatted_phone = format_phone_number(phone_number)

    url = f"{get_base_url()}/mpesa/stkpush/v1/processrequest"

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        # int(amount): M-Pesa sandbox rejects decimal amounts — whole
        # shillings only. Real shop prices like 1800.00 become 1800.
        "Amount": int(amount),
        "PartyA": formatted_phone,           # the customer's phone
        "PartyB": settings.MPESA_SHORTCODE,  # your business shortcode
        "PhoneNumber": formatted_phone,
        "CallBackURL": callback_url,
        # AccountReference shows on the customer's M-Pesa SMS receipt —
        # using the order ID makes support/reconciliation much easier
        "AccountReference": f"Order-{order_id}",
        "TransactionDesc": f"Payment for Perry's Collection Order #{order_id}",
    }

    response = requests.post(
        url,
        json=payload,
        headers={'Authorization': f'Bearer {access_token}'},
        timeout=15,
    )
    response.raise_for_status()

    return response.json()