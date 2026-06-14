# inventory_agent/models.py
#
# Every time the agent runs, we save the full results here.
# This means the React dashboard can load past reports instantly
# without re-running the agent every time.

from django.db import models
from django.utils import timezone


class AgentRun(models.Model):
    """
    One complete execution of the inventory agent.
    Stores timing, status, and the full markdown report Claude produced.
    """

    class Status(models.TextChoices):
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    triggered_by = models.CharField(
        max_length=100,
        default="manual",
        # "manual" = shop owner clicked the button
        # "cron"   = scheduled task ran automatically
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.RUNNING,
    )

    # The final markdown report Claude writes at the end
    report = models.TextField(blank=True, default="")

    # Raw JSON snapshot of inventory at run time — useful for auditing
    inventory_snapshot = models.JSONField(default=dict)

    # How many tool calls Claude made during this run
    tool_calls_made = models.PositiveIntegerField(default=0)

    error_message = models.TextField(blank=True, default="")

    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"AgentRun #{self.pk} [{self.status}] {self.started_at:%Y-%m-%d %H:%M}"

    @property
    def duration_seconds(self):
        if self.completed_at:
            return round((self.completed_at - self.started_at).total_seconds(), 1)
        return None


class InventoryFinding(models.Model):
    """
    A single finding the agent produced during a run.
    One AgentRun → many InventoryFindings.

    Separating findings from the report lets the dashboard
    filter/sort them (e.g. show only LOW_STOCK findings).
    """

    class FindingType(models.TextChoices):
        LOW_STOCK = "low_stock", "Low Stock"
        SLOW_MOVER = "slow_mover", "Slow Mover"
        RESTOCK_SUGGESTION = "restock_suggestion", "Restock Suggestion"
        HEALTHY = "healthy", "Healthy"

    class Severity(models.TextChoices):
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"
        INFO = "info", "Info"

    run = models.ForeignKey(
        AgentRun,
        on_delete=models.CASCADE,
        related_name="findings",
    )

    finding_type = models.CharField(max_length=30, choices=FindingType.choices)
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.INFO)

    # The product this finding is about
    product_id = models.IntegerField()
    product_name = models.CharField(max_length=255)
    product_slug = models.CharField(max_length=255)

    # Human-readable explanation Claude generated
    message = models.TextField()

    # Structured data the agent tool returned (stock count, days since sale etc.)
    data = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["severity", "finding_type"]

    def __str__(self):
        return f"[{self.severity.upper()}] {self.finding_type} — {self.product_name}"