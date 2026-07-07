"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { sampleProject } from "@/lib/sampleData";
import { parseWhatsAppChat, extractMessagesFromWhatsApp } from "@/lib/parseWhatsApp";
import { parseGitHubCSV } from "@/lib/parseGitHub";
import { parseBudgetSheet } from "@/lib/parseBudget";

type UploadState = "idle" | "loading" | "done" | "error";
interface FileStatus { github: UploadState; whatsapp: UploadState; budget: UploadState; }

export default function UploadPage() {
  const router      = useRouter();
  const githubRef   = useRef<HTMLInputElement>(null);
  const whatsappRef = useRef<HTMLInputElement>(null);
  const budgetRef   = useRef<HTMLInputElement>(null);

  const [status,    setStatus]    = useState<FileStatus>({ github: "idle", whatsapp: "idle", budget: "idle" });
  const [fileNames, setFileNames] = useState({ github: "", whatsapp: "", budget: "" });
  const [errors,    setErrors]    = useState({ github: "", whatsapp: "", budget: "" });

  const parsed = useRef({
    commits:           sampleProject.commits ?? [],
    whatsapp_messages: sampleProject.whatsapp_messages ?? [],
    budget_items:      sampleProject.budget_items ?? [],
    messages:          sampleProject.messages ?? [],
  });

  function setFS(key: keyof FileStatus, state: UploadState) {
    setStatus((p) => ({ ...p, [key]: state }));
  }

  async function handleGitHub(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setFS("github", "loading");
    setFileNames((p) => ({ ...p, github: file.name }));
    setErrors((p) => ({ ...p, github: "" }));
    try {
      const commits = parseGitHubCSV(await file.text());
      if (!commits.length) throw new Error("No commits parsed. Ensure CSV has headers: sha, author, date, message");
      parsed.current.commits = commits;
      setFS("github", "done");
    } catch (err: unknown) {
      setErrors((p) => ({ ...p, github: err instanceof Error ? err.message : "Parse failed" }));
      setFS("github", "error");
    }
  }

  async function handleWhatsApp(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setFS("whatsapp", "loading");
    setFileNames((p) => ({ ...p, whatsapp: file.name }));
    setErrors((p) => ({ ...p, whatsapp: "" }));
    try {
      const msgs = parseWhatsAppChat(await file.text());
      if (!msgs.length) throw new Error("No messages found. Export from WhatsApp → ⋮ → More → Export Chat → Without Media");
      parsed.current.whatsapp_messages = msgs;
      parsed.current.messages = extractMessagesFromWhatsApp(msgs);
      setFS("whatsapp", "done");
    } catch (err: unknown) {
      setErrors((p) => ({ ...p, whatsapp: err instanceof Error ? err.message : "Parse failed" }));
      setFS("whatsapp", "error");
    }
  }

  async function handleBudget(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setFS("budget", "loading");
    setFileNames((p) => ({ ...p, budget: file.name }));
    setErrors((p) => ({ ...p, budget: "" }));
    try {
      const XLSX  = await import("xlsx");
      const wb    = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
      const items = parseBudgetSheet({ Sheets: wb.Sheets, SheetNames: wb.SheetNames }, XLSX.utils);
      if (!items.length) throw new Error(`Sheets found: "${wb.SheetNames.join('", "')}". Rename one to "Budget".`);
      parsed.current.budget_items = items;
      setFS("budget", "done");
    } catch (err: unknown) {
      setErrors((p) => ({ ...p, budget: err instanceof Error ? err.message : "Parse failed" }));
      setFS("budget", "error");
    }
  }

  function handleAnalyze(useSample = false) {
    const project = useSample ? sampleProject : {
      ...sampleProject,
      commits:           parsed.current.commits,
      whatsapp_messages: parsed.current.whatsapp_messages,
      budget_items:      parsed.current.budget_items,
      messages:          parsed.current.messages,
    };
    sessionStorage.setItem("project", JSON.stringify(project));
    router.push("/dashboard");
  }

  const uploadedCount = Object.values(status).filter((s) => s === "done").length;

  const SOURCE_CONFIG = [
    {
      key:     "github" as keyof FileStatus,
      ref:     githubRef,
      accept:  ".csv",
      num:     "01",
      title:   "GitHub Commits",
      format:  "CSV file",
      desc:    "Your team's commit history — shows who is working, when they stopped, and risk patterns like WIP or hotfix commits.",
      hint:    'Run in terminal: git log --pretty=format:"%H,%an,%ad,%s" --date=short > commits.csv',
      handler: handleGitHub,
    },
    {
      key:     "whatsapp" as keyof FileStatus,
      ref:     whatsappRef,
      accept:  ".txt",
      num:     "02",
      title:   "WhatsApp Chat",
      format:  "TXT export",
      desc:    "Team communication — detects blocking language, approval waits, scope creep requests, and communication gaps.",
      hint:    "WhatsApp → Open chat → ⋮ Menu → More → Export Chat → Without Media",
      handler: handleWhatsApp,
    },
    {
      key:     "budget" as keyof FileStatus,
      ref:     budgetRef,
      accept:  ".xlsx,.xls",
      num:     "03",
      title:   "Budget Sheet",
      format:  "Excel file",
      desc:    'Tracks hours and cost per team member. Sheet tab must be named "Budget". Columns: Item, Budgeted Hours, Spent Hours, Cost Per Hour, Status.',
      hint:    "Status options: Active · Blocked · Cut · Done",
      handler: handleBudget,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0D1117", fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Top accent line */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #2F81F7 0%, #1F6FEB 60%, transparent 100%)" }} />

      {/* Nav */}
      <nav style={{
        borderBottom: "1px solid #2D333B",
        padding: "0 48px",
        height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 30, height: 30, border: "2px solid #2F81F7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 10, height: 10, backgroundColor: "#2F81F7" }} />
          </div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#F0EAD6", letterSpacing: "-0.02em" }}>
            Flow<span style={{ color: "#2F81F7" }}>Guard</span>
          </span>
        </div>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#545D68", letterSpacing: "0.1em" }}>
          RELEASE INTELLIGENCE
        </span>
      </nav>

      {/* Page body */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "64px 32px" }}>

        {/* Page heading */}
        <div style={{ marginBottom: 56 }}>
          <p style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12, letterSpacing: "0.2em",
            color: "#2F81F7", textTransform: "uppercase",
            marginBottom: 16,
          }}>
            Step 1 of 2 — Upload Your Data
          </p>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 900,
            color: "#F0EAD6",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: 20,
          }}>
            Upload your project files<br />
            <span style={{ color: "#2F81F7" }}>to analyze your deadline risk.</span>
          </h1>
          <p style={{
            fontSize: 17,
            color: "#768390",
            lineHeight: 1.8,
            maxWidth: 520,
          }}>
            Upload 1, 2, or all 3 sources below. More sources means higher confidence in your deadline probability score.
          </p>
        </div>

        {/* Upload cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
          {SOURCE_CONFIG.map((src) => {
            const s   = status[src.key];
            const err = errors[src.key];
            const fn  = fileNames[src.key];

            const accentColor =
              s === "done"    ? "#3FB950" :
              s === "error"   ? "#F85149" :
              s === "loading" ? "#2F81F7" : "#2D333B";

            return (
              <div key={src.key}>
                <div style={{
                  background: "#161B22",
                  border: `1px solid ${accentColor}`,
                  transition: "border-color 0.2s ease",
                  overflow: "hidden",
                }}>
                  {/* Card header — clickable */}
                  <button
                    onClick={() => src.ref.current?.click()}
                    style={{
                      width: "100%", background: "none", border: "none",
                      padding: "28px 32px",
                      cursor: "pointer", textAlign: "left",
                      display: "flex", alignItems: "flex-start", gap: 28,
                    }}
                  >
                    {/* Big number */}
                    <span style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 48,
                      fontWeight: 900,
                      lineHeight: 1,
                      color: s === "done" ? "#3FB950" : s === "error" ? "#F85149" : "#2D333B",
                      minWidth: 56,
                      transition: "color 0.3s ease",
                    }}>
                      {src.num}
                    </span>

                    {/* Text content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
                        <span style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: 22, fontWeight: 700,
                          color: "#F0EAD6",
                        }}>
                          {src.title}
                        </span>
                        <span style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: 10, letterSpacing: "0.12em",
                          color: "#545D68",
                          border: "1px solid #2D333B",
                          padding: "2px 8px",
                        }}>
                          {src.format}
                        </span>
                        {fn && (
                          <span style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 11, color: accentColor,
                          }}>
                            {s === "done" ? "✓ " : ""}{fn}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 15, color: "#768390", lineHeight: 1.7, marginBottom: 10 }}>
                        {src.desc}
                      </p>
                      <p style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 12, color: "#545D68",
                        lineHeight: 1.6,
                      }}>
                        {src.hint}
                      </p>
                    </div>

                    {/* Status icon */}
                    <div style={{ paddingTop: 4, minWidth: 32, display: "flex", justifyContent: "center" }}>
                      {s === "idle"    && <span style={{ fontSize: 24, color: "#2D333B" }}>+</span>}
                      {s === "done"    && <span style={{ fontSize: 22, color: "#3FB950" }}>✓</span>}
                      {s === "error"   && <span style={{ fontSize: 22, color: "#F85149" }}>✕</span>}
                      {s === "loading" && (
                        <div style={{ width: 18, height: 18, border: "2px solid #2D333B", borderTopColor: "#2F81F7", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      )}
                    </div>
                  </button>

                  {/* Error bar */}
                  {err && (
                    <div style={{
                      borderTop: "1px solid #F8514920",
                      background: "rgba(248,81,73,0.06)",
                      padding: "12px 32px",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 12, color: "#F85149", lineHeight: 1.6,
                    }}>
                      ✕ {err}
                    </div>
                  )}
                </div>

                <input ref={src.ref} type="file" accept={src.accept} style={{ display: "none" }} onChange={src.handler} />
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#545D68" }}>
              {uploadedCount === 0 && "Upload at least one file to continue"}
              {uploadedCount === 1 && "1 source uploaded — Low confidence analysis available"}
              {uploadedCount === 2 && "2 sources uploaded — Medium confidence analysis available"}
              {uploadedCount === 3 && "All 3 sources uploaded — Full analysis ready"}
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#545D68" }}>
              {uploadedCount}/3
            </span>
          </div>
          <div style={{ height: 3, background: "#2D333B" }}>
            <div style={{
              height: "100%",
              width: `${(uploadedCount / 3) * 100}%`,
              background: "#2F81F7",
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>

        {/* Analyze button */}
        <button
          onClick={() => handleAnalyze(false)}
          disabled={uploadedCount === 0}
          style={{
            width: "100%",
            padding: "20px",
            background: uploadedCount > 0 ? "#2F81F7" : "transparent",
            border: `1px solid ${uploadedCount > 0 ? "#2F81F7" : "#2D333B"}`,
            color: uploadedCount > 0 ? "#fff" : "#545D68",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 14, fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: uploadedCount > 0 ? "pointer" : "not-allowed",
            transition: "all 0.2s ease",
            marginBottom: 16,
          }}
          onMouseEnter={(e) => { if (uploadedCount > 0) (e.currentTarget as HTMLButtonElement).style.background = "#1F6FEB"; }}
          onMouseLeave={(e) => { if (uploadedCount > 0) (e.currentTarget as HTMLButtonElement).style.background = "#2F81F7"; }}
        >
          {uploadedCount === 0 ? "— Upload at least one file —" : "Analyze Project →"}
        </button>

        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => handleAnalyze(true)}
            style={{
              background: "none", border: "none",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 12, color: "#545D68",
              cursor: "pointer",
              textDecoration: "underline", textUnderlineOffset: 4,
            }}
          >
            or skip and use built-in sample data →
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}