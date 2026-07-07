"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalysisResult, sampleProject, PrioritizedTask } from "@/lib/sampleData";
import { FinalResult } from "@/lib/analyzeProject";
import { SaturationState, SATURATION_THRESHOLDS } from "@/lib/saturationEngine";

function getRiskColor(score: number) {
  if (score >= 70) return "#F85149";
  if (score >= 40) return "#D29922";
  return "#3FB950";
}

function getRiskLabel(score: number) {
  if (score >= 70) return "HIGH RISK";
  if (score >= 40) return "MODERATE";
  return "ON TRACK";
}

const PRIORITY_STYLES = {
  CRITICAL: { color: "#F85149", bg: "rgba(248,81,73,0.1)",  border: "#F8514940" },
  HIGH:     { color: "#D29922", bg: "rgba(210,153,34,0.1)", border: "#D2992240" },
  MEDIUM:   { color: "#2F81F7", bg: "rgba(47,129,247,0.1)", border: "#2F81F740" },
  LOW:      { color: "#545D68", bg: "rgba(84,93,104,0.1)",  border: "#545D6840" },
};

const STATUS_DOT: Record<string, string> = {
  "Blocked":     "#F85149",
  "In Progress": "#D29922",
  "Not Started": "#545D68",
  "Done":        "#3FB950",
};

export default function Dashboard() {
  const router = useRouter();
  const [result,       setResult]       = useState<FinalResult | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [errorDetail,  setErrorDetail]  = useState("");
  const [animatedProb, setAnimatedProb] = useState(0);

  useEffect(() => {
    async function run() {
      let project = sampleProject;

      try {
        const raw = sessionStorage.getItem("project");
        if (raw) project = JSON.parse(raw);
      } catch {
        console.warn("[Dashboard] Could not parse project from sessionStorage, using sample.");
      }

      try {
        const res = await fetch("/api/analyze", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ project }),
        });

        const text = await res.text();
        let json: { success: boolean; data?: FinalResult; error?: string; detail?: string };

        try {
          json = JSON.parse(text);
        } catch {
          setError("Server returned invalid JSON.");
          setErrorDetail(text.slice(0, 500));
          setLoading(false);
          return;
        }

        if (!res.ok || !json.success) {
          setError(json.error ?? `HTTP ${res.status}`);
          setErrorDetail(json.detail ?? "");
          setLoading(false);
          return;
        }

        if (!json.data) {
          setError("No data returned from analysis.");
          setLoading(false);
          return;
        }

        setResult(json.data);
      } catch (err) {
        setError("Network error — could not reach the analysis server.");
        setErrorDetail(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    run();
  }, []);

  useEffect(() => {
    if (!result) return;
    const target = result.deadline_extension_probability ?? 0;
    let cur = 0;
    const step = Math.max(1, target / 60);
    const iv = setInterval(() => {
      cur = Math.min(cur + step, target);
      setAnimatedProb(Math.round(cur));
      if (cur >= target) clearInterval(iv);
    }, 16);
    return () => clearInterval(iv);
  }, [result]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: "#0D1117",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 20,
      }}>
        <div style={{
          width: 40, height: 40,
          border: "2px solid #2D333B",
          borderTopColor: "#2F81F7",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#545D68", letterSpacing: "0.15em" }}>
          ANALYZING PROJECT DATA...
        </p>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#2D333B", letterSpacing: "0.1em" }}>
          This may take up to 15 seconds if AI is enabled
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        minHeight: "100vh", backgroundColor: "#0D1117",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "32px", gap: 16,
      }}>
        <div style={{ maxWidth: 600, width: "100%" }}>
          <div style={{ height: 3, background: "#F85149", marginBottom: 24 }} />
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#F85149", letterSpacing: "0.1em", marginBottom: 12 }}>
            ANALYSIS FAILED
          </p>
          <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 16, color: "#CDD9E5", marginBottom: 16 }}>
            {error}
          </p>
          {errorDetail && (
            <div style={{
              background: "#161B22", border: "1px solid #2D333B",
              padding: "16px", marginBottom: 24,
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
              color: "#F85149", lineHeight: 1.6,
              whiteSpace: "pre-wrap", wordBreak: "break-all",
            }}>
              {errorDetail}
            </div>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => { setError(""); setLoading(true); window.location.reload(); }}
              style={{
                background: "#2F81F7", border: "none", color: "#fff",
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                letterSpacing: "0.1em", padding: "12px 24px", cursor: "pointer",
              }}
            >
              Retry →
            </button>
            <button
              onClick={() => router.push("/upload")}
              style={{
                background: "transparent", border: "1px solid #2D333B", color: "#768390",
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                letterSpacing: "0.1em", padding: "12px 24px", cursor: "pointer",
              }}
            >
              ← Back to Upload
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const prob       = result.deadline_extension_probability ?? 0;
  const signals    = result.signals ?? { waiting: 0, scope_drift: 0, commit_velocity: 0, communication_gap: 0, budget_burn: 0 };
  const tasks      = result.prioritized_tasks ?? [];
  const heldTasks  = result.held_tasks ?? [];
  const saturation = result.saturation ?? null;
  const insights   = result.insights ?? [];
  const recs       = result.recommendations ?? [];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0D1117", fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Top accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${getRiskColor(prob)}, transparent)` }} />

      {/* Nav */}
      <nav style={{
        borderBottom: "1px solid #2D333B",
        padding: "0 32px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
        backgroundColor: "rgba(13,17,23,0.96)",
        backdropFilter: "blur(8px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.push("/upload")}
            style={{
              background: "none", border: "1px solid #2D333B",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
              color: "#545D68", padding: "6px 14px", cursor: "pointer",
              letterSpacing: "0.08em",
            }}
          >
            ← Back
          </button>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#F0EAD6" }}>
            Flow<span style={{ color: "#2F81F7" }}>Guard</span>
          </span>
        </div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
          color: result.ai_powered ? "#3FB950" : "#D29922",
          border: `1px solid ${result.ai_powered ? "#3FB95030" : "#D2992230"}`,
          padding: "4px 12px", letterSpacing: "0.08em",
        }}>
          {result.ai_powered ? "● AI POWERED" : "◌ FALLBACK MODE"}
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px 80px" }}>

        {/* ── ROW 1: Hero metric + 4 stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, marginBottom: 2 }}>

          {/* Big probability */}
          <div style={{ background: "#161B22", border: "1px solid #2D333B", padding: "44px 48px" }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#545D68", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 16 }}>
              Deadline Extension Probability
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 20 }}>
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(72px, 10vw, 108px)",
                fontWeight: 900, lineHeight: 1,
                color: getRiskColor(prob),
              }}>
                {animatedProb}
              </span>
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 40, fontWeight: 700, marginBottom: 10,
                color: getRiskColor(prob), opacity: 0.8,
              }}>
                %
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600,
                color: getRiskColor(prob), letterSpacing: "0.12em",
              }}>
                {getRiskLabel(prob)}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#545D68" }}>
                Confidence: {result.confidence ?? "Low"}
              </span>
            </div>
            <div style={{ height: 4, background: "#2D333B", borderRadius: 2 }}>
              <div style={{
                height: "100%",
                width: `${animatedProb}%`,
                background: getRiskColor(prob),
                borderRadius: 2,
                transition: "width 0.05s linear",
              }} />
            </div>
          </div>

          {/* 4 stat boxes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            {[
              { label: "Waiting Score",  value: result.waiting_score ?? 0,       unit: "",  desc: "Task blockage level" },
              { label: "Scope Drift",    value: result.scope_drift_score ?? 0,   unit: "",  desc: "Feature creep score" },
              { label: "Budget Burn",    value: result.budget_burn_percent ?? 0, unit: "%", desc: "Of budget consumed" },
              { label: "Wasted Hours",   value: result.wasted_hours ?? 0,        unit: "h", desc: "On cut features" },
            ].map(({ label, value, unit, desc }) => (
              <div key={label} style={{
                background: "#161B22", border: "1px solid #2D333B",
                padding: "28px 28px",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
              }}>
                <div>
                  <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#545D68", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
                    {label}
                  </p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 44, fontWeight: 700, lineHeight: 1,
                      color: getRiskColor(value),
                    }}>
                      {value}
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, color: getRiskColor(value), opacity: 0.7 }}>
                      {unit}
                    </span>
                  </div>
                </div>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#2D333B", marginTop: 8 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── ROW 2: Signal bars ── */}
        <div style={{ background: "#161B22", border: "1px solid #2D333B", padding: "32px 36px", marginBottom: 2 }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#545D68", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 28 }}>
            Signal Breakdown
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 32 }}>
            {[
              { label: "Waiting",     icon: "⏳", val: signals.waiting },
              { label: "Scope Drift", icon: "📈", val: signals.scope_drift },
              { label: "Commits",     icon: "💻", val: signals.commit_velocity },
              { label: "Comms Gap",   icon: "💬", val: signals.communication_gap },
              { label: "Budget",      icon: "💰", val: signals.budget_burn },
            ].map(({ label, icon, val }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#768390" }}>
                    {icon}&nbsp;&nbsp;{label}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: getRiskColor(val) }}>
                    {val}
                  </span>
                </div>
                <div style={{ height: 5, background: "#2D333B", borderRadius: 2 }}>
                  <div style={{
                    height: "100%",
                    width: `${val}%`,
                    background: getRiskColor(val),
                    borderRadius: 2,
                    transition: "width 1.2s ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SATURATION BANNER ── */}
        {saturation && (saturation.isBlocked || saturation.isWarning) && (
          <div style={{
            background:  saturation.isBlocked ? "rgba(239,68,68,0.06)"  : "rgba(234,179,8,0.06)",
            border:      `1px solid ${saturation.isBlocked ? "#EF4444" : "#EAB308"}`,
            boxShadow:   `0 0 24px ${saturation.isBlocked ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.12)"}`,
            padding:     "24px 32px",
            marginBottom: 2,
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{saturation.isBlocked ? "🔒" : "⚠️"}</span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: saturation.isBlocked ? "#EF4444" : "#EAB308",
                }}>
                  {saturation.isBlocked
                    ? "SIGNAL SATURATION — TASK HOLD ACTIVE"
                    : "ELEVATED SIGNALS — NEW WORK QUEUED"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {saturation.waiting.level !== "CLEAR" && (
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                    padding: "3px 10px",
                    background: saturation.isBlocked ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.15)",
                    color:      saturation.isBlocked ? "#EF4444"              : "#EAB308",
                    border:     `1px solid ${saturation.isBlocked ? "#EF444433" : "#EAB30833"}`,
                  }}>
                    ⏳ Waiting {saturation.waiting.score}/100
                  </span>
                )}
                {saturation.scope_drift.level !== "CLEAR" && (
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                    padding: "3px 10px",
                    background: saturation.isBlocked ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.15)",
                    color:      saturation.isBlocked ? "#EF4444"              : "#EAB308",
                    border:     `1px solid ${saturation.isBlocked ? "#EF444433" : "#EAB30833"}`,
                  }}>
                    📈 Scope Drift {saturation.scope_drift.score}/100
                  </span>
                )}
                {heldTasks.length > 0 && (
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                    padding: "3px 10px",
                    background: "#2D333B", color: "#768390",
                    border: "1px solid #3D444D",
                  }}>
                    {heldTasks.length} task{heldTasks.length !== 1 ? "s" : ""} held
                  </span>
                )}
              </div>
            </div>

            {/* Reason */}
            {saturation.blockReason && (
              <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: "#CDD9E5", lineHeight: 1.7, marginBottom: 16 }}>
                {saturation.blockReason}
              </p>
            )}

            {/* Completion gate progress bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#545D68" }}>
                  Initial task completion
                </span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700,
                  color: saturation.isBlocked ? "#EF4444" : "#EAB308",
                }}>
                  {Math.round(saturation.initialCompletionRate * 100)}% / {Math.round(SATURATION_THRESHOLDS.INITIAL_COMPLETION_GATE * 100)}% gate
                </span>
              </div>
              <div style={{ height: 6, background: "#2D333B", borderRadius: 3 }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, Math.round((saturation.initialCompletionRate / SATURATION_THRESHOLDS.INITIAL_COMPLETION_GATE) * 100))}%`,
                  background: saturation.isBlocked ? "#EF4444" : "#EAB308",
                  borderRadius: 3,
                  transition: "width 1s ease",
                }} />
              </div>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#2D333B", marginTop: 6 }}>
                {Math.round(saturation.initialCompletionRate * 100) < Math.round(SATURATION_THRESHOLDS.INITIAL_COMPLETION_GATE * 100)
                  ? `${Math.round(SATURATION_THRESHOLDS.INITIAL_COMPLETION_GATE * 100) - Math.round(saturation.initialCompletionRate * 100)}% more initial work needed to lift the hold`
                  : "Gate requirement met — held tasks will be admitted on next analysis"}
              </p>
            </div>
          </div>
        )}

        {/* ── ROW 3: Task table ── */}
        <div style={{ background: "#161B22", border: "1px solid #2D333B", marginBottom: 2 }}>
          <div style={{
            padding: "20px 32px", borderBottom: "1px solid #2D333B",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#545D68", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Prioritized Task Order
            </p>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#2D333B" }}>
                {tasks.length} active
              </p>
              {heldTasks.length > 0 && (
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                  padding: "3px 10px",
                  background: "rgba(234,179,8,0.1)", color: "#EAB308",
                  border: "1px solid rgba(234,179,8,0.3)",
                }}>
                  ⏸ {heldTasks.length} held
                </span>
              )}
            </div>
          </div>

          {tasks.length === 0 ? (
            <div style={{ padding: "40px 32px", textAlign: "center" }}>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#2D333B" }}>
                No task data available.
              </p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #2D333B" }}>
                  {["#", "Task", "Owner", "Status", "Idle", "Priority", "Reason"].map((h) => (
                    <th key={h} style={{
                      padding: "12px 20px", textAlign: "left",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10, fontWeight: 500,
                      color: "#545D68", letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, i) => {
                  const ps = PRIORITY_STYLES[task.priority as keyof typeof PRIORITY_STYLES] ?? PRIORITY_STYLES.LOW;
                  const dotColor = STATUS_DOT[task.status] ?? "#545D68";
                  return (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid #1C2333", transition: "background 0.1s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#1C2333")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "14px 20px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#545D68" }}>
                        {task.status === "Done" ? "✓" : String(i + 1).padStart(2, "0")}
                      </td>
                      <td style={{ padding: "14px 20px", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, fontWeight: 500, color: "#CDD9E5", maxWidth: 200 }}>
                        {task.title}
                      </td>
                      <td style={{ padding: "14px 20px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#768390" }}>
                        {task.assigned_to}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: dotColor }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, display: "inline-block", flexShrink: 0 }} />
                          {task.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: (task.days_idle ?? 0) > 5 ? "#D29922" : "#545D68" }}>
                        {task.days_idle ?? 0}d
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
                          color: ps.color, background: ps.bg,
                          border: `1px solid ${ps.border}`,
                          padding: "3px 9px",
                        }}>
                          {task.priority}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#545D68", maxWidth: 260 }}>
                        {task.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Held tasks section */}
          {heldTasks.length > 0 && (
            <>
              <div style={{
                padding: "16px 32px",
                borderTop: "1px solid #2D333B",
                display: "flex", alignItems: "center", gap: 16,
                background: "rgba(234,179,8,0.03)",
              }}>
                <div style={{ flex: 1, height: 1, background: "#2D333B" }} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#EAB308", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                  ⏸ HELD — AWAITING SATURATION GATE
                </span>
                <div style={{ flex: 1, height: 1, background: "#2D333B" }} />
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", opacity: 0.65 }}>
                <tbody>
                  {heldTasks.map((task, i) => {
                    const dotColor = STATUS_DOT[task.status] ?? "#545D68";
                    return (
                      <tr key={`held-${i}`} style={{ borderBottom: "1px solid #1C2333" }}>
                        <td style={{ padding: "12px 20px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#EAB308" }}>⏸</td>
                        <td style={{ padding: "12px 20px", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, fontWeight: 500, color: "#768390", maxWidth: 200 }}>
                          {task.title}
                        </td>
                        <td style={{ padding: "12px 20px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#545D68" }}>
                          {task.assigned_to}
                        </td>
                        <td style={{ padding: "12px 20px" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: dotColor }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, display: "inline-block", flexShrink: 0 }} />
                            {task.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px 20px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#545D68" }}>
                          {task.days_idle ?? 0}d
                        </td>
                        <td style={{ padding: "12px 20px" }}>
                          <span style={{
                            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
                            color: "#EAB308", background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)",
                            padding: "3px 9px",
                          }}>
                            HELD
                          </span>
                        </td>
                        <td style={{ padding: "12px 20px", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: "#545D68", maxWidth: 260 }}>
                          {task.reason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* ── ROW 4: Insights + Recommendations ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>

          {/* Insights */}
          <div style={{ background: "#161B22", border: "1px solid #2D333B" }}>
            <div style={{ padding: "20px 28px", borderBottom: "1px solid #2D333B" }}>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#545D68", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Detected Issues
              </p>
            </div>
            {insights.length === 0 ? (
              <p style={{ padding: "32px 28px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#2D333B" }}>
                No issues detected.
              </p>
            ) : (
              insights.map((text, i) => (
                <div key={i} style={{
                  padding: "20px 28px",
                  borderBottom: i < insights.length - 1 ? "1px solid #1C2333" : "none",
                  display: "flex", gap: 16, alignItems: "flex-start",
                }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#2D333B", marginTop: 3, minWidth: 24, flexShrink: 0 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: "#CDD9E5", lineHeight: 1.7, margin: 0 }}>
                    {text}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Recommendations */}
          <div style={{ background: "#161B22", border: "1px solid #2D333B" }}>
            <div style={{ padding: "20px 28px", borderBottom: "1px solid #2D333B" }}>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#545D68", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Recommended Actions
              </p>
            </div>
            {recs.length === 0 ? (
              <p style={{ padding: "32px 28px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#2D333B" }}>
                No recommendations available.
              </p>
            ) : (
              recs.map((text, i) => {
                const levels = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
                const level  = levels[i] ?? "LOW";
                const ps     = PRIORITY_STYLES[level];
                return (
                  <div key={i} style={{
                    padding: "20px 28px",
                    borderBottom: i < recs.length - 1 ? "1px solid #1C2333" : "none",
                    display: "flex", gap: 16, alignItems: "flex-start",
                  }}>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 9, fontWeight: 600, letterSpacing: "0.08em",
                      color: ps.color, border: `1px solid ${ps.border}`,
                      padding: "3px 7px", marginTop: 3,
                      whiteSpace: "nowrap", flexShrink: 0,
                    }}>
                      {level}
                    </span>
                    <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: "#CDD9E5", lineHeight: 1.7, margin: 0 }}>
                      {text}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#2D333B" }}>
            FLOWGUARD RELEASE INTELLIGENCE
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#2D333B" }}>
            {new Date().toLocaleString()}
          </span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}