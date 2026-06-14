# inventory_agent/views.py
#
# Three endpoints the React dashboard uses:
#
#   POST /api/inventory-agent/run/
#       Shop owner triggers a new agent run. Runs synchronously for now
#       (for production you'd push this to a Celery task).
#
#   GET  /api/inventory-agent/runs/
#       List of past runs — so the dashboard can show history.
#
#   GET  /api/inventory-agent/runs/<id>/
#       Full detail of one run including all findings and the report.

import logging
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, serializers

from .models import AgentRun, InventoryFinding
from .agent import run_agent
from products.permissions import IsShopOwner

logger = logging.getLogger(__name__)


# ── Serializers ───────────────────────────────────────────────────────────────

class FindingSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryFinding
        fields = [
            "id", "finding_type", "severity",
            "product_id", "product_name", "product_slug",
            "message", "data", "created_at",
        ]


class AgentRunListSerializer(serializers.ModelSerializer):
    """Compact — for the run history list."""
    finding_count = serializers.SerializerMethodField()
    high_severity_count = serializers.SerializerMethodField()

    class Meta:
        model = AgentRun
        fields = [
            "id", "status", "triggered_by",
            "tool_calls_made", "duration_seconds",
            "finding_count", "high_severity_count",
            "started_at", "completed_at",
        ]

    def get_finding_count(self, obj):
        return obj.findings.count()

    def get_high_severity_count(self, obj):
        return obj.findings.filter(severity="high").count()


class AgentRunDetailSerializer(serializers.ModelSerializer):
    """Full detail — includes findings and the markdown report."""
    findings = FindingSerializer(many=True, read_only=True)

    class Meta:
        model = AgentRun
        fields = [
            "id", "status", "triggered_by", "report",
            "tool_calls_made", "duration_seconds",
            "error_message", "started_at", "completed_at",
            "findings",
        ]


# ── Views ─────────────────────────────────────────────────────────────────────

class TriggerAgentRunView(APIView):
    """
    POST /api/inventory-agent/run/
    Shop owner only. Starts the agent and waits for it to finish.

    Returns the full run detail including report and findings.

    Note: for a large inventory this could take 30-60 seconds.
    In production, move run_agent() to a Celery task and poll for status.
    """
    permission_classes = [permissions.IsAuthenticated, IsShopOwner]

    def post(self, request):
        # Check if a run is already in progress — prevent double-runs
        already_running = AgentRun.objects.filter(status="running").exists()
        if already_running:
            return Response(
                {"detail": "An agent run is already in progress. Please wait for it to finish."},
                status=status.HTTP_409_CONFLICT,
            )

        # Create the run record first so we have an ID to attach findings to
        run = AgentRun.objects.create(
            triggered_by=f"manual:{request.user.email}",
            status=AgentRun.Status.RUNNING,
        )

        try:
            # This is where the agent loop runs
            run_agent(run)
        except Exception as exc:
            logger.exception("Agent run #%s failed: %s", run.id, exc)
            run.status = AgentRun.Status.FAILED
            run.error_message = str(exc)
            run.completed_at = timezone.now()
            run.save(update_fields=["status", "error_message", "completed_at"])

            return Response(
                {"detail": f"Agent run failed: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        run.refresh_from_db()
        return Response(
            AgentRunDetailSerializer(run).data,
            status=status.HTTP_201_CREATED,
        )


class AgentRunListView(APIView):
    """
    GET /api/inventory-agent/runs/
    Returns the 20 most recent runs — for the dashboard history panel.
    """
    permission_classes = [permissions.IsAuthenticated, IsShopOwner]

    def get(self, request):
        runs = AgentRun.objects.prefetch_related("findings").all()[:20]
        return Response(AgentRunListSerializer(runs, many=True).data)


class AgentRunDetailView(APIView):
    """
    GET /api/inventory-agent/runs/<id>/
    Full run detail — report markdown + all findings.
    """
    permission_classes = [permissions.IsAuthenticated, IsShopOwner]

    def get(self, request, pk):
        try:
            run = AgentRun.objects.prefetch_related("findings").get(pk=pk)
        except AgentRun.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(AgentRunDetailSerializer(run).data)