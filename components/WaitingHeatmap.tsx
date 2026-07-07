"use client";

import { sampleProject } from "@/lib/sampleData";

function getDaysColor(days: number, status: string) {
  if (status === "Done") return { bg: "#22C55E22", border: "#22C55E55", text: "#22C55E" };
  if (status === "Blocked") return { bg: "#EF444422", border: "#EF444455", text: "#EF4444" };
  if (days > 7) return { bg: "#EF444411", border: "#EF444433", text: "#EF4444" };
  if (days > 3) return { bg: "#EAB30811", border: "#EAB30833", text: "#EAB308" };
  return { bg: "#22C55E11", border: "#22C55E33", text: "#6B7280" };
}

const STATUS_LABELS: Record<string, string> = {
  Done: "DONE", "In Progress": "WIP", Blocked: "BLOCKED", "Not Started": "IDLE",
};

export default function WaitingHeatmap() {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="mb-4">
        <h3 className="font-display font-semibold text-sm text-text">Task Staleness Heatmap</h3>
        <p className="font-mono text-xs text-muted mt-0.5">Days since last update</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {sampleProject.tasks.map((task, i) => {
          const colors = getDaysColor(task.last_updated_days_ago, task.status);
          return (
            <div key={i} className="rounded-lg p-3 flex flex-col gap-1.5 transition-all hover:scale-[1.02]"
              style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-body text-xs text-text leading-tight">{task.title}</span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded shrink-0"
                  style={{ color: colors.text, background: colors.border }}>
                  {STATUS_LABELS[task.status]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted">{task.assigned_to}</span>
                <span className="font-mono text-xs font-bold" style={{ color: colors.text }}>+{task.last_updated_days_ago}d</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-4 pt-3 border-t border-border">
        {[{ color: "#22C55E", label: "Active" }, { color: "#EAB308", label: "Stale 3d+" }, { color: "#EF4444", label: "Blocked / 7d+" }].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
            <span className="font-mono text-[10px] text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}