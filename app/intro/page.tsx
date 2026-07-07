"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const WORD = ["F", "l", "o", "w", "G", "u", "a", "r", "d"];

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  color: string;
}

// Generate particles outside component so they are stable
const PARTICLES: Particle[] = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  opacity: Math.random() * 0.35 + 0.08,
  duration: Math.random() * 4 + 2,
  delay: Math.random() * 3,
  color: i % 3 === 0 ? "#2F81F7" : "#768390",
}));

export default function IntroPage() {
  const router = useRouter();

  const [visibleLetters, setVisibleLetters] = useState<number[]>([]);
  const [showParticles,  setShowParticles]  = useState(false);
  const [showSub,        setShowSub]        = useState(false);
  const [showBtn,        setShowBtn]        = useState(false);
  const [leaving,        setLeaving]        = useState(false);

  useEffect(() => {
    WORD.forEach((_, i) => {
      setTimeout(() => {
        setVisibleLetters((prev) => [...prev, i]);
        if (i === 0) setShowParticles(true);
      }, 300 + i * 200);
    });

    const allDone = 300 + WORD.length * 200 + 300;
    setTimeout(() => setShowSub(true), allDone);
    setTimeout(() => setShowBtn(true), allDone + 500);
  }, []);

  function handleEnter() {
    setLeaving(true);
    setTimeout(() => router.push("/upload"), 700);
  }

  const allLettersVisible = visibleLetters.length === WORD.length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#0D1117",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        opacity: leaving ? 0 : 1,
        transition: "opacity 0.7s ease",
        cursor: "default",
      }}
    >
      {/* ── Ambient floating particles ── */}
      {showParticles &&
        PARTICLES.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: "50%",
              opacity: p.opacity,
              animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
              pointerEvents: "none",
            }}
          />
        ))}

      {/* ── Horizontal scan line ── */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent 0%, #2F81F720 20%, #2F81F760 50%, #2F81F720 80%, transparent 100%)",
          animation: "scanDown 2.8s linear infinite",
          pointerEvents: "none",
        }}
      />

      {/* ── Corner brackets ── */}
      <div style={{ position: "absolute", top: 24, left: 24, width: 22, height: 22, borderTop: "2px solid #2F81F740", borderLeft: "2px solid #2F81F740" }} />
      <div style={{ position: "absolute", top: 24, right: 24, width: 22, height: 22, borderTop: "2px solid #2F81F740", borderRight: "2px solid #2F81F740" }} />
      <div style={{ position: "absolute", bottom: 24, left: 24, width: 22, height: 22, borderBottom: "2px solid #2F81F740", borderLeft: "2px solid #2F81F740" }} />
      <div style={{ position: "absolute", bottom: 24, right: 24, width: 22, height: 22, borderBottom: "2px solid #2F81F740", borderRight: "2px solid #2F81F740" }} />

      {/* ── Main content ── */}
      <div style={{ textAlign: "center", position: "relative", zIndex: 10, padding: "0 24px" }}>

        {/* Letter-by-letter title */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          {WORD.map((letter, i) => {
            const isVisible = visibleLetters.includes(i);
            const isGuard   = i >= 4;
            return (
              <span
                key={i}
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(68px, 13vw, 128px)",
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  color: isGuard ? "#2F81F7" : "#F0EAD6",
                  display: "inline-block",
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible
                    ? "translateY(0) scale(1)"
                    : "translateY(24px) scale(0.8)",
                  transition:
                    "opacity 0.4s ease, transform 0.5s cubic-bezier(0.34, 1.4, 0.64, 1)",
                  textShadow:
                    isGuard && isVisible
                      ? "0 0 80px rgba(47,129,247,0.35)"
                      : "none",
                }}
              >
                {letter}
              </span>
            );
          })}
        </div>

        {/* Underline */}
        <div
          style={{
            height: 2,
            background: "linear-gradient(90deg, transparent, #2F81F7, transparent)",
            marginBottom: 36,
            opacity: allLettersVisible ? 1 : 0,
            transform: allLettersVisible ? "scaleX(1)" : "scaleX(0)",
            transition: "opacity 0.7s ease 0.1s, transform 0.9s ease 0.1s",
            transformOrigin: "center",
          }}
        />

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "clamp(11px, 1.8vw, 14px)",
            letterSpacing: "0.3em",
            color: "#545D68",
            textTransform: "uppercase",
            marginBottom: 52,
            opacity: showSub ? 1 : 0,
            transform: showSub ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          Release Intelligence Platform
        </p>

        {/* Button */}
        <div
          style={{
            opacity: showBtn ? 1 : 0,
            transform: showBtn ? "translateY(0)" : "translateY(18px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <button
            onClick={handleEnter}
            style={{
              background: "transparent",
              border: "1px solid #2F81F7",
              color: "#2F81F7",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              padding: "18px 60px",
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background = "#2F81F7";
              el.style.color      = "#0D1117";
              el.style.boxShadow  = "0 0 32px rgba(47,129,247,0.3)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = "transparent";
              el.style.color      = "#2F81F7";
              el.style.boxShadow  = "none";
            }}
          >
            Analyze Your Project →
          </button>

          <p
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              color: "#2D333B",
              marginTop: 22,
              letterSpacing: "0.12em",
            }}
          >
            — or click anywhere to continue —
          </p>
        </div>
      </div>

      {/* ── Version labels ── */}
      <div style={{ position: "absolute", bottom: 20, left: 28 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#2D333B", letterSpacing: "0.1em" }}>
          FLOWGUARD v2.0
        </span>
      </div>
      <div style={{ position: "absolute", bottom: 20, right: 28 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#2D333B", letterSpacing: "0.1em" }}>
          HACKATHON 2025
        </span>
      </div>

      {/* ── Click anywhere overlay (only after button appears) ── */}
      {showBtn && (
        <div
          onClick={handleEnter}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            cursor: "pointer",
          }}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&family=IBM+Plex+Mono:wght@400;500&display=swap');

        @keyframes scanDown {
          0%   { top: -2px; }
          100% { top: 100%; }
        }

        @keyframes floatParticle {
          0%   { transform: translate(0px, 0px);    }
          100% { transform: translate(6px, -10px);  }
        }
      `}</style>
    </div>
  );
}