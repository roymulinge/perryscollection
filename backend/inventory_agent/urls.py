from django.urls import path
from .views import TriggerAgentRunView, AgentRunListView, AgentRunDetailView

urlpatterns = [
    # POST — shop owner triggers a new agent run
    path("run/", TriggerAgentRunView.as_view(), name="agent-run-trigger"),

    # GET — list of past runs for the history panel
    path("runs/", AgentRunListView.as_view(), name="agent-run-list"),

    # GET — full detail of one run (report + findings)
    path("runs/<int:pk>/", AgentRunDetailView.as_view(), name="agent-run-detail"),
]