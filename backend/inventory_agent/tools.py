# inventory_agent/tools.py
#
# TOOLS are the functions the agent is allowed to call.
# Each tool:
#   1. Has a name and description Claude reads to decide WHEN to call it
#   2. Has a parameters schema Claude uses to know WHAT to pass
#   3. Has a matching Python function that actually runs against your DB
#
# The pattern:
#   TOOL_DEFINITIONS  → sent to Claude so it knows what tools exist
#   execute_tool()    → called by the agent loop when Claude picks a tool

import json
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Q

logger = logging.getLogger(__name__)

# ── STEP 1: Define the tools Claude can see ──────────────────────────────────
# This list is sent to the Anthropic API. Claude reads the descriptions and
# decides which tool to call and what arguments to pass.

TOOL_DEFINITIONS = [
    {
        "name": "get_all_products",
        "description": (
            "Fetches the full product inventory from the database. "
            "Returns every active product with its current stock level, price, "
            "category, and basic sales data. Always call this first."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "include_inactive": {
                    "type": "boolean",
                    "description": "If true, include inactive/unlisted products. Default false.",
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_sales_velocity",
        "description": (
            "For a specific product, returns how many units were sold in the last N days "
            "and the date of the most recent sale. Use this to identify slow-moving items "
            "and to calculate restock quantities."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "product_id": {
                    "type": "integer",
                    "description": "The product's database ID.",
                },
                "days": {
                    "type": "integer",
                    "description": "How many days back to look. Default 30.",
                },
            },
            "required": ["product_id"],
        },
    },
    {
        "name": "flag_finding",
        "description": (
            "Records a finding about a product. Call this whenever you identify: "
            "a low stock situation, a slow-moving product, or a restock suggestion. "
            "Be specific in your message — the shop owner will read this directly."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "product_id": {"type": "integer"},
                "product_name": {"type": "string"},
                "product_slug": {"type": "string"},
                "finding_type": {
                    "type": "string",
                    "enum": ["low_stock", "slow_mover", "restock_suggestion", "healthy"],
                    "description": "Category of this finding.",
                },
                "severity": {
                    "type": "string",
                    "enum": ["high", "medium", "low", "info"],
                    "description": "high=urgent action needed, medium=watch closely, low=informational, info=all good.",
                },
                "message": {
                    "type": "string",
                    "description": "Clear, actionable message for the shop owner.",
                },
                "data": {
                    "type": "object",
                    "description": "Supporting numbers: stock count, days since last sale, suggested restock qty etc.",
                },
            },
            "required": ["product_id", "product_name", "product_slug", "finding_type", "severity", "message"],
        },
    },
    {
        "name": "get_inventory_summary",
        "description": (
            "Returns high-level inventory statistics: total products, total stock value, "
            "number of out-of-stock products, best sellers, and worst sellers. "
            "Call this to gather data for the weekly summary report."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "top_n": {
                    "type": "integer",
                    "description": "How many top/bottom products to return. Default 5.",
                }
            },
            "required": [],
        },
    },
]


# ── STEP 2: The Python functions that actually run ────────────────────────────

def _get_all_products(include_inactive: bool = False) -> dict:
    """Query the products table and return a clean dict the agent can reason about."""
    # Import here to avoid circular imports at module level
    from products.models import Product

    qs = Product.objects.select_related("category")
    if not include_inactive:
        qs = qs.filter(is_active=True)

    products = []
    for p in qs:
        products.append({
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "category": p.category.name if p.category else "Uncategorised",
            "price_kes": float(p.price),
            "stock": p.stock,
            "total_stock_value_kes": float(p.total_value),
            "is_active": p.is_active,
        })

    return {
        "total_products": len(products),
        "products": products,
    }


def _get_sales_velocity(product_id: int, days: int = 30) -> dict:
    """
    Count how many units of a product were sold in the last N days.
    Also return the date of the last sale.
    """
    from orders.models import OrderItem, Order

    since = timezone.now() - timedelta(days=days)

    # Only count items from confirmed/shipped/delivered orders
    # (not pending or cancelled — those haven't actually sold)
    completed_statuses = ["confirmed", "shipped", "delivered"]

    items = OrderItem.objects.filter(
        product_id=product_id,
        order__status__in=completed_statuses,
        order__created_at__gte=since,
    )

    total_sold = items.aggregate(total=Sum("quantity"))["total"] or 0

    # Find the most recent sale for this product
    last_order_item = (
        OrderItem.objects.filter(
            product_id=product_id,
            order__status__in=completed_statuses,
        )
        .order_by("-order__created_at")
        .select_related("order")
        .first()
    )

    last_sale_date = None
    days_since_last_sale = None

    if last_order_item:
        last_sale_date = last_order_item.order.created_at.strftime("%Y-%m-%d")
        days_since_last_sale = (timezone.now() - last_order_item.order.created_at).days

    return {
        "product_id": product_id,
        "period_days": days,
        "units_sold": total_sold,
        "daily_average": round(total_sold / days, 2) if days else 0,
        "last_sale_date": last_sale_date,
        "days_since_last_sale": days_since_last_sale,
    }


def _flag_finding(
    product_id: int,
    product_name: str,
    product_slug: str,
    finding_type: str,
    severity: str,
    message: str,
    data: dict = None,
    run=None,  # AgentRun instance — injected by execute_tool()
) -> dict:
    """Save a finding to the database. Returns confirmation."""
    from inventory_agent.models import InventoryFinding

    finding = InventoryFinding.objects.create(
        run=run,
        finding_type=finding_type,
        severity=severity,
        product_id=product_id,
        product_name=product_name,
        product_slug=product_slug,
        message=message,
        data=data or {},
    )

    return {
        "saved": True,
        "finding_id": finding.id,
        "message": f"Finding recorded for {product_name}: {finding_type} ({severity})",
    }


def _get_inventory_summary(top_n: int = 5) -> dict:
    """
    Aggregate statistics across the whole inventory.
    Best sellers = most units sold in last 30 days.
    Worst sellers = fewest units sold (but still active).
    """
    from products.models import Product
    from orders.models import OrderItem
    from django.db.models import Sum

    since = timezone.now() - timedelta(days=30)
    completed = ["confirmed", "shipped", "delivered"]

    # Total inventory value
    all_products = Product.objects.filter(is_active=True)
    total_value = sum(float(p.total_value) for p in all_products)
    out_of_stock_count = all_products.filter(stock=0).count()
    low_stock_count = all_products.filter(stock__gt=0, stock__lte=5).count()

    # Best sellers by quantity sold in last 30 days
    best_sellers = (
        OrderItem.objects.filter(
            order__status__in=completed,
            order__created_at__gte=since,
        )
        .values("product_id", "product_name")
        .annotate(total_sold=Sum("quantity"))
        .order_by("-total_sold")[:top_n]
    )

    # Worst performers = active products with lowest sales
    worst_sellers = (
        OrderItem.objects.filter(
            order__status__in=completed,
            order__created_at__gte=since,
        )
        .values("product_id", "product_name")
        .annotate(total_sold=Sum("quantity"))
        .order_by("total_sold")[:top_n]
    )

    return {
        "total_active_products": all_products.count(),
        "total_inventory_value_kes": round(total_value, 2),
        "out_of_stock_count": out_of_stock_count,
        "low_stock_count": low_stock_count,
        "best_sellers_last_30_days": list(best_sellers),
        "worst_sellers_last_30_days": list(worst_sellers),
    }


# ── STEP 3: The dispatcher ────────────────────────────────────────────────────
# The agent loop calls execute_tool(name, inputs, run) whenever Claude
# picks a tool. This function routes to the right Python function.

def execute_tool(tool_name: str, tool_input: dict, run) -> str:
    """
    Called by the agent loop each time Claude selects a tool.
    Returns a JSON string — that's what gets fed back to Claude.
    """
    logger.info("Agent calling tool: %s with input: %s", tool_name, tool_input)

    try:
        if tool_name == "get_all_products":
            result = _get_all_products(
                include_inactive=tool_input.get("include_inactive", False)
            )

        elif tool_name == "get_sales_velocity":
            result = _get_sales_velocity(
                product_id=tool_input["product_id"],
                days=tool_input.get("days", 30),
            )

        elif tool_name == "flag_finding":
            result = _flag_finding(
                product_id=tool_input["product_id"],
                product_name=tool_input["product_name"],
                product_slug=tool_input["product_slug"],
                finding_type=tool_input["finding_type"],
                severity=tool_input["severity"],
                message=tool_input["message"],
                data=tool_input.get("data", {}),
                run=run,
            )

        elif tool_name == "get_inventory_summary":
            result = _get_inventory_summary(
                top_n=tool_input.get("top_n", 5)
            )

        else:
            result = {"error": f"Unknown tool: {tool_name}"}

    except Exception as exc:
        logger.exception("Tool %s raised an exception: %s", tool_name, exc)
        result = {"error": str(exc)}

    return json.dumps(result, default=str)
    # default=str handles Decimal and datetime objects that aren't JSON-serialisable