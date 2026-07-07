import { ProjectData } from "./sampleData";

export interface AnalysisResult {
  delay_risk_score: number;
  waiting_score: number;
  scope_drift_score: number;
  scope_growth_percent: number;
  insights: string[];
  recommendations: string[];
}

const WAITING_KEYWORDS = [
  "waiting", "blocked", "pending", "approval",
  "hold", "delay", "stuck", "need", "sign-off",
];

export function computeWaitingScore(data: ProjectData): number {
  const tasks = data.tasks ?? [];
  const messages = data.messages ?? [];
  const whatsappMsgs = data.whatsapp_messages ?? [];

  let score = 0;

  for (const task of tasks) {
    if (!task) continue;
    if (task.status === "Blocked") score += 20;
    else if ((task.last_updated_days_ago ?? 0) > 7) score += 15;
    else if ((task.last_updated_days_ago ?? 0) > 3) score += 8;
  }

  const allMessages = [
    ...messages,
    ...whatsappMsgs.map((m) => m?.text ?? ""),
  ];

  for (const msg of allMessages) {
    if (!msg || typeof msg !== "string") continue;
    const lower = msg.toLowerCase();
    const hits = WAITING_KEYWORDS.filter((kw) => lower.includes(kw)).length;
    score += hits * 6;
  }

  return Math.min(100, Math.round(score));
}

export function computeScopeDriftScore(data: ProjectData): {
  score: number;
  growthPercent: number;
} {
  const initial = (data.initial_features ?? []).length;
  const current = (data.current_features ?? []).length;

  if (initial === 0) return { score: 0, growthPercent: 0 };

  const added = Math.max(0, current - initial);
  const growthPercent = Math.round((added / initial) * 100);
  const score = Math.min(100, Math.round((growthPercent / 50) * 100));

  return { score, growthPercent };
}

export function computeDelayRisk(w: number, s: number): number {
  return Math.min(100, Math.round(w * 0.6 + s * 0.4));
}

export function fallbackAnalysis(data: ProjectData): AnalysisResult {
  const tasks = data.tasks ?? [];
  const messages = data.messages ?? [];
  const initial_features = data.initial_features ?? [];
  const current_features = data.current_features ?? [];

  const safeData: ProjectData = {
    ...data,
    tasks,
    messages,
    initial_features,
    current_features,
    whatsapp_messages: data.whatsapp_messages ?? [],
    commits: data.commits ?? [],
    budget_items: data.budget_items ?? [],
  };

  const waitingScore = computeWaitingScore(safeData);
  const { score: scopeDriftScore, growthPercent } = computeScopeDriftScore(safeData);
  const delayRiskScore = computeDelayRisk(waitingScore, scopeDriftScore);

  const blockedTasks = tasks.filter((t) => t?.status === "Blocked");
  const staleTasks = tasks.filter((t) => t && (t.last_updated_days_ago ?? 0) > 5);
  const addedFeatures = current_features.filter((f) => f && !initial_features.includes(f));

  const insights: string[] = [];

  if (blockedTasks.length > 0)
    insights.push(`${blockedTasks.length} task(s) currently blocked: ${blockedTasks.map((t) => t.title).join(", ")}.`);
  if (staleTasks.length > 0)
    insights.push(`${staleTasks.length} task(s) have not been updated in over 5 days.`);
  if (addedFeatures.length > 0)
    insights.push(`Scope grew by ${addedFeatures.length} feature(s) since kickoff: ${addedFeatures.join(", ")}.`);

  const waitingMessages = messages.filter(
    (m) => m && typeof m === "string" &&
    WAITING_KEYWORDS.some((kw) => m.toLowerCase().includes(kw))
  );
  if (waitingMessages.length > 0)
    insights.push(`${waitingMessages.length} message(s) contain blocking language detected.`);

  if (insights.length === 0)
    insights.push("Not enough data to detect issues. Upload more files for deeper analysis.");

  const recommendations: string[] = [];

  if (waitingScore > 50) {
    recommendations.push("Hold a daily 15-min unblocking standup to resolve approval chains faster.");
    recommendations.push("Assign a single decision-maker per pending approval.");
  }
  if (scopeDriftScore > 40)
    recommendations.push(`Freeze scope immediately. Move ${addedFeatures.length} new feature(s) to v2.1 backlog.`);
  if (delayRiskScore > 60)
    recommendations.push("Consider negotiating a 1-week release buffer with stakeholders.");
  if (staleTasks.length > 2)
    recommendations.push("Re-assign stale tasks — anything idle over 5 days needs immediate ownership change.");
  if (recommendations.length === 0)
    recommendations.push("Project looks relatively healthy. Upload more files for a complete picture.");

  return {
    delay_risk_score: delayRiskScore,
    waiting_score: waitingScore,
    scope_drift_score: scopeDriftScore,
    scope_growth_percent: growthPercent,
    insights,
    recommendations,
  };
}