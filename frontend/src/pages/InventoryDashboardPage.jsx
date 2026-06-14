// src/pages/InventoryDashboardPage.jsx
//
// Shop owner dashboard for the inventory agent.
// - "Run Analysis" button triggers the agent
// - Shows live status while it runs
// - Displays findings grouped by severity
// - Renders the markdown report
// - Shows past run history

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/client";

// ── Severity config ──────────────────────────────────────────────────────────
const SEVERITY = {
  high:   { label: "Urgent",  color: "#fca5a5", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)",   dot: "#ef4444" },
  medium: { label: "Watch",   color: "#fcd34d", bg: "rgba(234,179,8,0.08)",  border: "rgba(234,179,8,0.2)",   dot: "#eab308" },
  low:    { label: "Low",     color: "#c4ab82", bg: "rgba(196,148,72,0.08)", border: "rgba(196,148,72,0.2)",  dot: "#c49448" },
  info:   { label: "Healthy", color: "#86efac", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.15)",  dot: "#22c55e" },
};

const FINDING_ICONS = {
  low_stock:          "ti-alert-triangle",
  slow_mover:         "ti-trending-down",
  restock_suggestion: "ti-package-import",
  healthy:            "ti-circle-check",
};

// ── Sub-components ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }) {
  const cfg = SEVERITY[severity] || SEVERITY.info;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 9px", borderRadius: 20,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: "0.06em",
      textTransform: "uppercase",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function FindingCard({ finding }) {
  const icon = FINDING_ICONS[finding.finding_type] || "ti-info-circle";
  const cfg = SEVERITY[finding.severity] || SEVERITY.info;

  return (
    <div style={{
      padding: "1rem 1.25rem",
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 10,
      display: "grid",
      gridTemplateColumns: "36px 1fr auto",
      gap: "0.85rem",
      alignItems: "start",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: "rgba(18,10,6,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, color: cfg.color, flexShrink: 0,
      }}>
        <i className={`ti ${icon}`} aria-hidden="true" />
      </div>

      <div>
        <p style={{ margin: "0 0 3px", fontWeight: 600, color: "#ddc799", fontSize: 14 }}>
          {finding.product_name}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "#9a7a4a", lineHeight: 1.6 }}>
          {finding.message}
        </p>
        {/* Show key data points if present */}
        {finding.data && Object.keys(finding.data).length > 0 && (
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            {finding.data.stock !== undefined && (
              <span style={{ fontSize: 12, color: "#7a5e3a" }}>
                Stock: <strong style={{ color: "#c4ab82" }}>{finding.data.stock}</strong>
              </span>
            )}
            {finding.data.units_sold !== undefined && (
              <span style={{ fontSize: 12, color: "#7a5e3a" }}>
                Sold (30d): <strong style={{ color: "#c4ab82" }}>{finding.data.units_sold}</strong>
              </span>
            )}
            {finding.data.days_since_last_sale !== undefined && (
              <span style={{ fontSize: 12, color: "#7a5e3a" }}>
                Last sale: <strong style={{ color: "#c4ab82" }}>{finding.data.days_since_last_sale}d ago</strong>
              </span>
            )}
          </div>
        )}
      </div>

      <SeverityBadge severity={finding.severity} />
    </div>
  );
}

function RunHistoryItem({ run, onSelect, isSelected }) {
  const date = new Date(run.started_at).toLocaleDateString("en-KE", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <button
      onClick={() => onSelect(run.id)}
      style={{
        width: "100%", textAlign: "left", padding: "0.85rem 1rem",
        background: isSelected ? "rgba(196,148,72,0.1)" : "transparent",
        border: `1px solid ${isSelected ? "rgba(196,148,72,0.4)" : "rgba(196,148,72,0.12)"}`,
        borderRadius: 10, cursor: "pointer",
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#ddc799" }}>Run #{run.id}</span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
          background: run.status === "completed" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          color: run.status === "completed" ? "#86efac" : "#fca5a5",
          border: `1px solid ${run.status === "completed" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
        }}>
          {run.status}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#5a3e22" }}>{date}</div>
      {run.high_severity_count > 0 && (
        <div style={{ fontSize: 12, color: "#fca5a5", marginTop: 4 }}>
          🔴 {run.high_severity_count} urgent
        </div>
      )}
    </button>
  );
}

// Simple markdown renderer (handles headers, bold, bullets, code)
function MarkdownReport({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  return (
    <div style={{ fontSize: 14, lineHeight: 1.8, color: "#c4ab82" }}>
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <h2 key={i} style={{ color: "#e8c87a", fontFamily: "Georgia,serif", fontWeight: 400, fontSize: "1.2rem", margin: "1.5rem 0 0.5rem", borderBottom: "1px solid rgba(196,148,72,0.12)", paddingBottom: "0.5rem" }}>{line.slice(3)}</h2>;
        if (line.startsWith("# "))  return <h1 key={i} style={{ color: "#f0dba8", fontFamily: "Georgia,serif", fontWeight: 400, fontSize: "1.5rem", margin: "0 0 1rem" }}>{line.slice(2)}</h1>;
        if (line.startsWith("### ")) return <h3 key={i} style={{ color: "#ddc799", fontWeight: 600, fontSize: "1rem", margin: "1rem 0 0.4rem" }}>{line.slice(4)}</h3>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <div key={i} style={{ paddingLeft: "1rem", marginBottom: "0.25rem" }}>• {line.slice(2).replace(/\*\*(.*?)\*\*/g, "$1")}</div>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} style={{ fontWeight: 700, color: "#ddc799", margin: "0.5rem 0" }}>{line.slice(2, -2)}</p>;
        if (line.trim() === "") return <div key={i} style={{ height: "0.5rem" }} />;
        // Inline bold
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return <p key={i} style={{ margin: "0.2rem 0" }}>{parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: "#e8c87a" }}>{p}</strong> : p)}</p>;
      })}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function InventoryDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState("findings"); // "findings" | "report"
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [error, setError] = useState("");

  // Elapsed timer while agent is running
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!authLoading && (!user || !user.is_shop_owner)) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchRuns();
  }, []);

  useEffect(() => {
    if (running) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [running]);

  async function fetchRuns() {
    setLoadingRuns(true);
    try {
      const res = await apiClient.get("/inventory-agent/runs/");
      setRuns(res.data);
      // Auto-select the most recent run
      if (res.data.length > 0 && !selectedRun) {
        await loadRunDetail(res.data[0].id);
      }
    } catch {
      setError("Failed to load run history.");
    } finally {
      setLoadingRuns(false);
    }
  }

  async function loadRunDetail(runId) {
    try {
      const res = await apiClient.get(`/inventory-agent/runs/${runId}/`);
      setSelectedRun(res.data);
    } catch {
      setError("Failed to load run details.");
    }
  }

  async function triggerRun() {
    setRunning(true);
    setError("");
    setSelectedRun(null);

    try {
      // This call blocks until the agent finishes (could be 30-60s)
      const res = await apiClient.post("/inventory-agent/run/");
      setSelectedRun(res.data);
      await fetchRuns(); // Refresh history
      setActiveTab("findings");
    } catch (err) {
      const msg = err.response?.data?.detail || "Agent run failed. Check your ANTHROPIC_API_KEY.";
      setError(msg);
    } finally {
      setRunning(false);
    }
  }

  // Group findings by severity for display
  const highFindings   = selectedRun?.findings?.filter((f) => f.severity === "high") || [];
  const mediumFindings = selectedRun?.findings?.filter((f) => f.severity === "medium") || [];
  const lowFindings    = selectedRun?.findings?.filter((f) => f.severity === "low") || [];
  const infoFindings   = selectedRun?.findings?.filter((f) => f.severity === "info") || [];

  if (authLoading) return null;

  return (
    <>
      <style>{`
        @keyframes pc-spin { to { transform: rotate(360deg); } }
        @keyframes pc-pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .inv-tab { padding:0.45rem 1rem;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:500;transition:background 0.2s,color 0.2s; }
        .inv-tab.active { background:rgba(196,148,72,0.12);color:#e8c87a; }
        .inv-tab:not(.active) { background:transparent;color:#7a5e3a; }
        .inv-tab:not(.active):hover { color:#c4ab82; }
        @media(max-width:900px){ .inv-layout{ grid-template-columns:1fr !important; } .inv-sidebar{ display:none; } }
      `}</style>

      <main style={{ background: "#120a06", minHeight: "100vh", padding: "2.5rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2.5rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c49448", display: "block", marginBottom: 6 }}>
                AI Agent
              </span>
              <h1 style={{ fontFamily: "Georgia,serif", fontSize: "clamp(1.8rem,3vw,2.4rem)", fontWeight: 400, color: "#f0dba8", margin: 0 }}>
                Inventory Manager
              </h1>
              <p style={{ color: "#7a5e3a", fontSize: 14, margin: "6px 0 0" }}>
                The agent checks every product, flags issues, and writes a weekly report.
              </p>
            </div>

            <button
              onClick={triggerRun}
              disabled={running}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "0.75rem 1.75rem",
                background: running ? "rgba(196,148,72,0.15)" : "linear-gradient(135deg,#c49448,#8b5e1a)",
                border: running ? "1px solid rgba(196,148,72,0.3)" : "none",
                borderRadius: 12, cursor: running ? "not-allowed" : "pointer",
                fontSize: 14, fontWeight: 700,
                color: running ? "#c49448" : "#120a06",
                transition: "all 0.2s",
              }}
            >
              {running ? (
                <>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(196,148,72,0.3)", borderTopColor: "#c49448", animation: "pc-spin 0.8s linear infinite" }} />
                  Running… {elapsed}s
                </>
              ) : (
                <>
                  <i className="ti ti-robot" aria-hidden="true" style={{ fontSize: 18 }} />
                  Run Analysis
                </>
              )}
            </button>
          </div>

          {/* Running state banner */}
          {running && (
            <div style={{
              marginBottom: "1.5rem", padding: "1.25rem 1.5rem",
              background: "rgba(196,148,72,0.06)", border: "1px solid rgba(196,148,72,0.2)",
              borderRadius: 12, display: "flex", alignItems: "center", gap: "1rem",
            }}>
              <div style={{ animation: "pc-pulse 1.5s ease-in-out infinite", fontSize: 22 }}>🤖</div>
              <div>
                <p style={{ margin: "0 0 3px", fontWeight: 600, color: "#e8c87a", fontSize: 14 }}>
                  Agent is working…
                </p>
                <p style={{ margin: 0, fontSize: 13, color: "#7a5e3a" }}>
                  Checking every product, calculating sales velocity, and writing your report. This takes about 30–60 seconds.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginBottom: "1.5rem", padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, color: "#fca5a5", fontSize: 14 }} role="alert">
              {error}
            </div>
          )}

          <div className="inv-layout" style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "1.5rem", alignItems: "start" }}>

            {/* Main content */}
            <div>
              {/* No run selected yet */}
              {!selectedRun && !running && (
                <div style={{ textAlign: "center", padding: "5rem 0", background: "#1a0f08", border: "1px solid rgba(196,148,72,0.12)", borderRadius: 16 }}>
                  <div style={{ fontSize: 56, marginBottom: "1rem" }}>🤖</div>
                  <h2 style={{ fontFamily: "Georgia,serif", fontSize: "1.5rem", color: "#f0dba8", fontWeight: 400, margin: "0 0 0.75rem" }}>
                    No analysis yet
                  </h2>
                  <p style={{ color: "#7a5e3a", fontSize: 14, margin: "0 0 2rem", maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
                    Click "Run Analysis" above and the agent will check your entire inventory, flag issues, and write a report.
                  </p>
                </div>
              )}

              {/* Run results */}
              {selectedRun && (
                <div style={{ background: "#1a0f08", border: "1px solid rgba(196,148,72,0.15)", borderRadius: 16, overflow: "hidden" }}>

                  {/* Run meta header */}
                  <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(196,148,72,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#ddc799" }}>Run #{selectedRun.id}</span>
                      <span style={{ fontSize: 13, color: "#5a3e22" }}>
                        {new Date(selectedRun.started_at).toLocaleString("en-KE")}
                      </span>
                      {selectedRun.duration_seconds && (
                        <span style={{ fontSize: 13, color: "#5a3e22" }}>{selectedRun.duration_seconds}s</span>
                      )}
                      <span style={{ fontSize: 13, color: "#5a3e22" }}>{selectedRun.tool_calls_made} tool calls</span>
                    </div>

                    {/* Summary badges */}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {highFindings.length > 0 && <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)", fontWeight: 600 }}>🔴 {highFindings.length} urgent</span>}
                      {mediumFindings.length > 0 && <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, background: "rgba(234,179,8,0.1)", color: "#fcd34d", border: "1px solid rgba(234,179,8,0.2)", fontWeight: 600 }}>🟡 {mediumFindings.length} watch</span>}
                      {infoFindings.length > 0 && <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, background: "rgba(34,197,94,0.08)", color: "#86efac", border: "1px solid rgba(34,197,94,0.15)", fontWeight: 600 }}>✅ {infoFindings.length} healthy</span>}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div style={{ padding: "0.75rem 1.5rem", borderBottom: "1px solid rgba(196,148,72,0.1)", display: "flex", gap: "0.25rem" }}>
                    <button className={`inv-tab ${activeTab === "findings" ? "active" : ""}`} onClick={() => setActiveTab("findings")}>
                      <i className="ti ti-list-check" style={{ marginRight: 6 }} aria-hidden="true" />
                      Findings ({selectedRun.findings?.length || 0})
                    </button>
                    <button className={`inv-tab ${activeTab === "report" ? "active" : ""}`} onClick={() => setActiveTab("report")}>
                      <i className="ti ti-file-text" style={{ marginRight: 6 }} aria-hidden="true" />
                      Weekly Report
                    </button>
                  </div>

                  <div style={{ padding: "1.5rem" }}>
                    {activeTab === "findings" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                        {highFindings.length > 0 && (
                          <div>
                            <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#fca5a5", margin: "0 0 0.75rem", display: "flex", alignItems: "center", gap: 8 }}>
                              🔴 Urgent — Action needed
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                              {highFindings.map((f) => <FindingCard key={f.id} finding={f} />)}
                            </div>
                          </div>
                        )}
                        {mediumFindings.length > 0 && (
                          <div>
                            <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#fcd34d", margin: "0 0 0.75rem" }}>
                              🟡 Watch closely
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                              {mediumFindings.map((f) => <FindingCard key={f.id} finding={f} />)}
                            </div>
                          </div>
                        )}
                        {lowFindings.length > 0 && (
                          <div>
                            <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#c49448", margin: "0 0 0.75rem" }}>
                              Low priority
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                              {lowFindings.map((f) => <FindingCard key={f.id} finding={f} />)}
                            </div>
                          </div>
                        )}
                        {infoFindings.length > 0 && (
                          <div>
                            <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#86efac", margin: "0 0 0.75rem" }}>
                              ✅ Healthy
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                              {infoFindings.map((f) => <FindingCard key={f.id} finding={f} />)}
                            </div>
                          </div>
                        )}
                        {selectedRun.findings?.length === 0 && (
                          <p style={{ color: "#5a3e22", textAlign: "center", padding: "2rem" }}>No findings recorded in this run.</p>
                        )}
                      </div>
                    )}

                    {activeTab === "report" && (
                      <div>
                        {selectedRun.report ? (
                          <MarkdownReport text={selectedRun.report} />
                        ) : (
                          <p style={{ color: "#5a3e22", textAlign: "center", padding: "2rem" }}>No report generated yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar: run history */}
            <div className="inv-sidebar">
              <h3 style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5a3e22", margin: "0 0 0.75rem" }}>
                Run History
              </h3>
              {loadingRuns ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid rgba(196,148,72,0.15)", borderTopColor: "#c49448", animation: "pc-spin 0.8s linear infinite" }} />
                </div>
              ) : runs.length === 0 ? (
                <p style={{ color: "#3a2a18", fontSize: 13, textAlign: "center", padding: "1rem" }}>No runs yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {runs.map((run) => (
                    <RunHistoryItem
                      key={run.id}
                      run={run}
                      isSelected={selectedRun?.id === run.id}
                      onSelect={loadRunDetail}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}