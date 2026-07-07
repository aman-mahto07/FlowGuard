"use client";

import { useEffect, useState } from "react";

interface RiskScoreProps {
  score: number;
  label?: string;
  size?: "lg" | "sm";
}

function getScoreColor(score: number) {
  if (score >= 70) return { stroke: "#EF4444", text: "#EF4444", label: "HIGH RISK" };
  if (score >= 40) return { stroke: "#EAB308", text: "#EAB308", label: "MODERATE" };
  return { stroke: "#22C55E", text: "#22C55E", label: "ON TRACK" };
}

export default function RiskScore({ score, label = "Release Risk", size = "lg" }: RiskScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  const isLarge = size === "lg";
  const svgSize = isLarge ? 200 : 120;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const radius = isLarge ? 80 : 48;
  const strokeWidth = isLarge ? 10 : 7;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (animatedScore / 100) * circumference;
  const colors = getScoreColor(score);

  useEffect(() => {
    const timer = setTimeout(() => {
      const step = score / 50;
      let current = 0;
      const interval = setInterval(() => {
        current = Math.min(current + step, score);
        setAnimatedScore(Math.round(current));
        if (current >= score) clearInterval(interval);
      }, 20);
      return () => clearInterval(interval);
    }, 300);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1E2028" strokeWidth={strokeWidth} />
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke={colors.stroke} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.05s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-extrabold leading-none" style={{ fontSize: isLarge ? 48 : 28, color: colors.text }}>
            {animatedScore}
          </span>
          <span className="font-mono text-xs tracking-widest mt-1" style={{ color: colors.text, opacity: 0.7 }}>
            {colors.label}
          </span>
        </div>
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: `0 0 ${isLarge ? 40 : 24}px ${colors.stroke}22` }} />
      </div>
      <p className="font-mono text-xs text-muted tracking-widest uppercase">{label}</p>
    </div>
  );
}