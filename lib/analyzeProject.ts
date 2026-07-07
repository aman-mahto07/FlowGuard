// lib/analyzeProject.ts

import { ProjectData, AnalysisResult as FullResult, PrioritizedTask } from "./sampleData";
import { fallbackAnalysis } from "./scoring";
import { computeDeadlineScore } from "./deadlineScore";
import { prioritizeTasks } from "./prioritizeTasks";
import {
  evaluateSaturation,
  gateTasksBySignal,
  generateSaturationInsights,
  generateSaturationRecommendations,
  SaturationState,
  GatedTaskList,
} from "./saturationEngine";

export type FinalResult = FullResult & {
  held_tasks: PrioritizedTask[];
  saturation: SaturationState;
};

function buildPrompt(data: ProjectData, saturationHint: string): string {
  return `You are a senior release manager and project risk analyst.

Analyze this project and return ONLY valid JSON — no markdown, no explanation.

${saturationHint ? `IMPORTANT CONTEXT: ${saturationHint}\n` : ""}

Return exactly this schema:
{
  "delay_risk_score": <0-100>,
  "waiting_score": <0-100>,
  "scope_drift_score": <0-100>,
  "scope_growth_percent": <number>,
  "deadline_extension_probability": <0-100>,
  "confidence": <"Low"|"Medium"|"High">,
  "insights": [<3 to 5 strings>],
  "recommendations": [<3 to 5 strings>]
}

Project Data:
${JSON.stringify({
  project_name: data.project_name,
  release_date: data.release_date,
  tasks: data.tasks ?? [],
  messages: data.messages ?? [],
  initial_features: data.initial_features ?? [],
  current_features: data.current_features ?? [],
  commit_count: (data.commits ?? []).length,
  whatsapp_message_count: (data.whatsapp_messages ?? []).length,
  budget_item_count: (data.budget_items ?? []).length,
}, null, 2)}

JSON only.`;
}

export async function analyzeProject(data: ProjectData): Promise<FinalResult> {
  const apiKey = process.env.LLM_API_KEY;

  // Step 1: Deterministic signals — this is the single source of truth for signals
  let deadlineAssessment;
  try {
    deadlineAssessment = computeDeadlineScore(data);
  } catch (err) {
    console.warn("[FlowGuard] deadlineScore failed:", err);
    deadlineAssessment = {
      probability: 50,
      confidence: "Low" as const,
      signals: { waiting: 0, scope_drift: 0, commit_velocity: 0, budget_burn: 0, communication_gap: 0 },
      time_remaining_percent: 50,
      budget_burn_percent: 0,
      financial_risk: "Low" as const,
      wasted_hours: 0,
    };
  }

  // Use deadlineAssessment.signals as the AUTHORITATIVE signal values
  // These are what show in the Signal Breakdown UI, so saturation must use these too
  const authoritativeSignals = deadlineAssessment.signals;

  // Step 2: Evaluate saturation BEFORE anything else, using authoritative signals
  const saturation = evaluateSaturation(
    authoritativeSignals,
    data.tasks ?? [],
    data.initial_features ?? [],
    data.current_features ?? []
  );

  // Step 3: Prioritize tasks with signal awareness
  let allPrioritized: PrioritizedTask[] = [];
  try {
    allPrioritized = prioritizeTasks(
      data.tasks ?? [],
      data.initial_features ?? [],
      authoritativeSignals.waiting,
      authoritativeSignals.scope_drift,
    );
  } catch (err) {
    console.warn("[FlowGuard] prioritizeTasks failed:", err);
  }

  // Step 4: Gate tasks
  const gated: GatedTaskList = gateTasksBySignal(
    allPrioritized,
    saturation,
    data.initial_features ?? [],
    data.current_features ?? []
  );

  const { budget_burn_percent, financial_risk, wasted_hours } = deadlineAssessment;
  const saturationHint = saturation.blockReason ?? "";

  // Step 5: Get text content (insights/recommendations) from AI or fallback
  if (!apiKey) {
    console.log("[FlowGuard] No LLM_API_KEY — using fallback scoring.");
    const base = fallbackAnalysis(data);
    return buildFinalResult(base, deadlineAssessment, authoritativeSignals, gated, saturation, budget_burn_percent, financial_risk, wasted_hours, false);
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: buildPrompt(data, saturationHint) }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) throw new Error(`Groq error: ${response.status}`);

    const groqData = await response.json();
    const rawText = groqData.choices?.[0]?.message?.content ?? "";
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const aiResult = JSON.parse(cleaned);

    return buildFinalResult(aiResult, deadlineAssessment, authoritativeSignals, gated, saturation, budget_burn_percent, financial_risk, wasted_hours, true);
  } catch (err) {
    console.warn("[FlowGuard] Groq failed, using fallback:", err);
    const base = fallbackAnalysis(data);
    return buildFinalResult(base, deadlineAssessment, authoritativeSignals, gated, saturation, budget_burn_percent, financial_risk, wasted_hours, false);
  }
}

function buildFinalResult(
  base: {
    delay_risk_score: number;
    waiting_score: number;
    scope_drift_score: number;
    scope_growth_percent: number;
    insights: string[];
    recommendations: string[];
    deadline_extension_probability?: number;
    confidence?: string;
  },
  deadline: ReturnType<typeof computeDeadlineScore>,
  authoritativeSignals: ReturnType<typeof computeDeadlineScore>["signals"],
  gated: GatedTaskList,
  saturation: SaturationState,
  budgetBurnPercent: number,
  financialRisk: "Low" | "Medium" | "High",
  wastedHours: number,
  aiPowered: boolean
): FinalResult {
  const satInsights = generateSaturationInsights(saturation);
  const satRecs     = generateSaturationRecommendations(saturation);

  return {
    delay_risk_score:               base.delay_risk_score ?? 0,

    // CRITICAL: use authoritative signal values so UI and saturation logic always agree
    waiting_score:                  authoritativeSignals.waiting,
    scope_drift_score:              authoritativeSignals.scope_drift,

    scope_growth_percent:           base.scope_growth_percent ?? 0,
    deadline_extension_probability: base.deadline_extension_probability ?? deadline.probability ?? 0,
    confidence:                     (base.confidence as "Low" | "Medium" | "High") ?? deadline.confidence ?? "Low",

    prioritized_tasks: gated.active,
    held_tasks:        gated.held,
    saturation,

    budget_burn_percent:    budgetBurnPercent ?? 0,
    time_remaining_percent: deadline.time_remaining_percent ?? 50,
    wasted_hours:           wastedHours ?? 0,
    financial_risk:         financialRisk ?? "Low",

    // Single source of truth for signals — always from deadlineAssessment
    signals: authoritativeSignals,

    insights:        [...satInsights, ...base.insights].slice(0, 6),
    recommendations: [...satRecs,     ...base.recommendations].slice(0, 6),
    ai_powered:      aiPowered,
  };
}