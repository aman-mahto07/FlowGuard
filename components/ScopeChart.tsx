"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { scopeGrowthHistory } from "@/lib/sampleData";

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded px-3 py-2 font-mono text-xs">
      <p className="text-muted">{label}</p>
      <p className="text-accent">{payload[0].value} features</p>
    </div>
  );
}

export default function ScopeChart() {
  const baseline = scopeGrowthHistory[0].features;
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-sm text-text">Scope Growth</h3>
          <p className="font-mono text-xs text-muted mt-0.5">Feature count over time</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={scopeGrowthHistory} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={baseline} stroke="#1E2028" strokeDasharray="6 3" />
          <Line type="monotone" dataKey="features" stroke="#F97316" strokeWidth={2}
            dot={{ fill: "#F97316", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#F97316" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}