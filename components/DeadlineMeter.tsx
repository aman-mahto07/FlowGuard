"use client";
// Big deadline probability meter — the hero number

import { useEffect, useState } from "react";

interface Props { probability: number; confidence: "Low" | "Medium" | "High"; }

export default function DeadlineMeter({ probability, confidence }: Props) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const step = probability / 60;
    let cur = 0;
    const iv = setInterval(() => {
      cur = Math.min(cur + step, probability);
      setAnimated(Math.round(cur));
      if (cur >= probability) clearInterval(iv);
    }, 16);
    return () => clearInterval(iv);
  }, [probability]);

  const color = probability >= 70 ? "#EF4444" : probability >= 40 ? "#EAB308" : "#22C55E";
  const label = probability >= 70 ? "HIGH CHANCE OF DELAY" : probability >= 40 ? "MODERATE RISK" : "LIKELY ON TRACK";

  return (
    <div className="bg-surface border border-border rounded-xl p-8 flex flex-col items-center gap-4">
      <p className="font-mono text-[10px] text-muted tracking-widest uppercase">
        Deadline Extension Probability
      </p>

      {/* Big number */}
      <div className="relative flex items-end justify-center gap-1">
        <span className="font-display font-extrabold leading-none"
          style={{ fontSize: 96, color }}>
          {animated}
        </span>
        <span className="font-display font-bold mb-4 text-4xl" style={{ color }}>%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-75"
          style={{ width: `${animated}%`, background: color,
            boxShadow: `0 0 12px ${color}88` }} />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between w-full">
        <span className="font-mono text-xs font-bold tracking-widest" style={{ color }}>
          {label}
        </span>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border"
          style={{ borderColor: `${color}44`, color }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          <span className="font-mono text-[10px]">{confidence} Confidence</span>
        </div>
      </div>
    </div>
  );
}