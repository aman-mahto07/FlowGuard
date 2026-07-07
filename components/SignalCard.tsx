"use client";
// Shows each signal score as a horizontal bar

import { SignalBreakdown } from "@/lib/sampleData";

const SIGNAL_META = {
  waiting:           { label: "Waiting Bottlenecks", icon: "⏳", source: "Tasks + WhatsApp" },
  scope_drift:       { label: "Scope Drift",          icon: "📈", source: "Features list" },
  commit_velocity:   { label: "Commit Velocity Drop", icon: "💻", source: "GitHub CSV" },
  communication_gap: { label: "Communication Gap",    icon: "💬", source: "WhatsApp Chat" },
  budget_burn:       { label: "Budget Burn Rate",     icon: "💰", source: "Budget Excel" },
};

function getBarColor(score: number) {
  if (score >= 70) return "#EF4444";
  if (score >= 40) return "#EAB308";
  return "#22C55E";
}

interface Props { signals: SignalBreakdown; }

export default function SignalCard({ signals }: Props) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 rounded-full bg-warn" />
        <h3 className="font-display font-semibold text-sm text-text">
          Signal Breakdown
        </h3>
        <span className="font-mono text-[10px] text-muted ml-1">
          (what is driving the risk)
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {Object.entries(signals).map(([key, value]) => {
          const meta = SIGNAL_META[key as keyof typeof SIGNAL_META];
          const color = getBarColor(value);
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{meta.icon}</span>
                  <span className="font-body text-xs text-text">{meta.label}</span>
                  <span className="font-mono text-[9px] text-muted/60 hidden sm:block">
                    ({meta.source})
                  </span>
                </div>
                <span className="font-mono text-xs font-bold" style={{ color }}>
                  {value}
                </span>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <div className="h-full rounded-full"
                  style={{
                    width: `${value}%`,
                    background: color,
                    boxShadow: `0 0 8px ${color}66`,
                    transition: "width 0.8s ease",
                  }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}