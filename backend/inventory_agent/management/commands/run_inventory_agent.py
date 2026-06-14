# inventory_agent/management/commands/run_inventory_agent.py
#
# Lets you run the agent from the terminal:
#   python manage.py run_inventory_agent
#
# Or schedule it with cron (runs every Monday at 8am Nairobi time):
#   0 8 * * 1 cd /path/to/project && python manage.py run_inventory_agent --triggered-by cron

import logging
from django.core.management.base import BaseCommand
from django.utils import timezone

from inventory_agent.models import AgentRun
from inventory_agent.agent import run_agent

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Run the inventory management agent. Analyses stock and produces a report."

    def add_arguments(self, parser):
        parser.add_argument(
            "--triggered-by",
            type=str,
            default="cli",
            help="Who/what triggered this run. Default: 'cli'",
        )

    def handle(self, *args, **options):
        triggered_by = options["triggered_by"]

        self.stdout.write(self.style.HTTP_INFO(
            f"\n🤖 Starting inventory agent (triggered by: {triggered_by})...\n"
        ))

        run = AgentRun.objects.create(
            triggered_by=triggered_by,
            status=AgentRun.Status.RUNNING,
        )

        self.stdout.write(f"   Run ID: #{run.id}")
        self.stdout.write(f"   Started: {run.started_at:%Y-%m-%d %H:%M:%S}\n")

        try:
            report = run_agent(run)
            run.refresh_from_db()

            self.stdout.write(self.style.SUCCESS(
                f"\n✅ Agent completed in {run.duration_seconds}s "
                f"({run.tool_calls_made} tool calls)\n"
            ))

            # Print the findings summary
            findings = run.findings.all()
            high = findings.filter(severity="high").count()
            medium = findings.filter(severity="medium").count()

            if high:
                self.stdout.write(self.style.ERROR(f"   🔴 High severity: {high}"))
            if medium:
                self.stdout.write(self.style.WARNING(f"   🟡 Medium severity: {medium}"))

            self.stdout.write(f"   📋 Total findings: {findings.count()}\n")

            # Print the report
            self.stdout.write("\n" + "─" * 60)
            self.stdout.write(report)
            self.stdout.write("─" * 60 + "\n")

        except Exception as exc:
            run.status = AgentRun.Status.FAILED
            run.error_message = str(exc)
            run.completed_at = timezone.now()
            run.save(update_fields=["status", "error_message", "completed_at"])

            self.stdout.write(self.style.ERROR(f"\n❌ Agent failed: {exc}\n"))
            raise