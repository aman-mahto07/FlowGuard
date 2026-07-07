"use client";

const ICONS = ["⚡", "🔴", "📊", "💬", "🔒"];

export default function InsightCard({ insight, index }: { insight: string; index: number }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex gap-3 items-start animate-slide-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both", opacity: 0 }}>
      <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 text-sm">
        {ICONS[index % ICONS.length]}
      </div>
      <div>
        <p className="font-mono text-[10px] text-accent uppercase tracking-widest mb-1">Insight #{index + 1}</p>
        <p className="text-sm text-text leading-relaxed">{insight}</p>
      </div>
    </div>
  );
}