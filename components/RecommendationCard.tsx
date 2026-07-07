"use client";

const PRIORITY_LABELS = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "LOW"];
const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "#EF4444", HIGH: "#F97316", MEDIUM: "#EAB308", LOW: "#6B7280",
};

export default function RecommendationCard({ recommendation, index }: { recommendation: string; index: number }) {
  const priority = PRIORITY_LABELS[Math.min(index, PRIORITY_LABELS.length - 1)];
  const color = PRIORITY_COLORS[priority];
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex gap-3 items-start animate-slide-up"
      style={{ animationDelay: `${index * 80 + 200}ms`, animationFillMode: "both", opacity: 0 }}>
      <div className="w-1 rounded-full self-stretch shrink-0" style={{ background: color }} />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-mono text-[9px] tracking-widest px-1.5 py-0.5 rounded"
            style={{ color, background: `${color}18` }}>{priority}</span>
          <span className="font-mono text-[10px] text-muted">Action #{index + 1}</span>
        </div>
        <p className="text-sm text-text leading-relaxed">{recommendation}</p>
      </div>
    </div>
  );
}