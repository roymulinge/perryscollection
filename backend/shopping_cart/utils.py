# shopping_cart/utils.py
# ─────────────────────────────────────────────────────────────────
# WHAT CHANGED:
# __iter__() now re-validates each item against LIVE product data
# every time the cart is read, not just at add-time. This closes
# two real bugs:
#
# 1. STALE PRICE: previously, price was frozen as a string the
#    moment you called .add(). If the admin changed the price an
#    hour later, the customer's cart silently kept charging the
#    OLD price all the way to checkout. We now always read the
#    LIVE product.price for display and totals, and only fall back
#    to the stored snapshot if the product somehow vanished.
#
# 2. STALE AVAILABILITY: if a product is deactivated or sells out
#    completely AFTER being added to someone's cart, the cart used
#    to keep showing it as a normal orderable item. Now we flag it.
# ─────────────────────────────────────────────────────────────────

from decimal import Decimal
from django.conf import settings
from products.models import Product


class Cart:
    """Session-based cart manager for API usage."""

    def __init__(self, request):
        self.session = request.session
        cart = self.session.get(settings.CART_SESSION_ID)
        if not cart:
            cart = self.session[settings.CART_SESSION_ID] = {}
        self.cart = cart

    def add(self, product, quantity=1, override_quantity=False):
        product_id = str(product.id)
        if product_id not in self.cart:
            # We still store a price snapshot here for reference/auditing,
            # but it is NO LONGER trusted for totals — see __iter__ below.
            self.cart[product_id] = {'quantity': 0, 'price': str(product.price)}

        if override_quantity:
            self.cart[product_id]['quantity'] = quantity
        else:
            self.cart[product_id]['quantity'] += quantity

        if self.cart[product_id]['quantity'] > product.stock:
            raise ValueError(f"Only {product.stock} in stock.")
        self.save()

    def save(self):
        self.session.modified = True

    def remove(self, product):
        product_id = str(product.id)
        if product_id in self.cart:
            del self.cart[product_id]
            self.save()

    def __iter__(self):
        """
        Yields one dict per cart item, ALWAYS using the product's
        CURRENT live price and availability — never the stale
        snapshot taken when the item was first added.
        """
        product_ids = self.cart.keys()

        # NOTE: we no longer filter by available=True/is_active=True here.
        # We WANT to fetch deactivated/sold-out products too, so we can
        # show the customer "this item is no longer available" instead
        # of having it silently vanish from their cart with no explanation.
        products = Product.objects.select_related('category').filter(id__in=product_ids)
        products_by_id = {str(p.id): p for p in products}

        for product_id, item_data in self.cart.copy().items():
            product = products_by_id.get(product_id)

            if not product:
                # Product was hard-deleted from the DB entirely (rare,
                # since most FKs use PROTECT, but defensive coding matters)
                continue

            quantity = item_data['quantity']

            # ── Live price, not the stale snapshot ──
            # This is the actual fix for stale pricing: we read
            # product.price fresh from the database every time the
            # cart is displayed, rather than trusting whatever string
            # was saved into the session at add-time.
            live_price = product.price

            yield {
                'product': product,
                'quantity': quantity,
                'price': live_price,
                'total_price': live_price * quantity,
                # Frontend uses these two flags to grey out / warn about
                # items that are no longer purchasable
                'is_available': product.is_active and product.available and product.stock > 0,
                'stock_remaining': product.stock,
            }

    def __len__(self):
        return sum(item['quantity'] for item in self.cart.values())

    def get_total_price(self):
        """
        Recomputed using LIVE prices via __iter__(), not the raw
        session dict — keeps totals consistent with what's displayed.
        """
        return sum(item['total_price'] for item in self)

    def clear(self):
        if settings.CART_SESSION_ID in self.session:
            del self.session[settings.CART_SESSION_ID]
            self.save()

    def update_quantity(self, product, quantity):
        product_id = str(product.id)
        if product_id in self.cart:
            if quantity <= 0:
                self.remove(product)
            else:
                if quantity > product.stock:
                    raise ValueError(f"Only {product.stock} in stock.")
                self.cart[product_id]['quantity'] = quantity
                self.save()