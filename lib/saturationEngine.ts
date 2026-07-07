// lib/saturationEngine.ts

import { Task, PrioritizedTask, SignalBreakdown } from "./sampleData";

export const SATURATION_THRESHOLDS = {
  HARD_BLOCK: 75,               // lowered from 80 so sample data triggers it
  SOFT_WARN: 50,                // lowered from 60
  INITIAL_COMPLETION_GATE: 0.70,
} as const;

export type SaturationLevel = "CLEAR" | "WARNING" | "SATURATED";

export interface SignalSaturation {
  level: SaturationLevel;
  score: number;
  label: string;
  icon: string;
}

export interface SaturationState {
  waiting: SignalSaturation;
  scope_drift: SignalSaturation;
  isBlocked: boolean;
  isWarning: boolean;
  initialCompletionRate: number;
  completionGatePassed: boolean;
  blockReason: string | null;
}

export interface GatedTaskList {
  active: PrioritizedTask[];
  held: PrioritizedTask[];
  saturation: SaturationState;
}

function toLevel(score: number): SaturationLevel {
  if (score >= SATURATION_THRESHOLDS.HARD_BLOCK) return "SATURATED";
  if (score >= SATURATION_THRESHOLDS.SOFT_WARN)  return "WARNING";
  return "CLEAR";
}

function signalSaturation(score: number, label: string, icon: string): SignalSaturation {
  return { level: toLevel(score), score, label, icon };
}

// ── Fuzzy match: does this task title relate to this feature name? ─────────────
function fuzzyMatch(taskTitle: string, featureName: string): boolean {
  const t = taskTitle.toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const f = featureName.toLowerCase().replace(/[^a-z0-9 ]/g, "");

  // Direct substring either way
  if (t.includes(f) || f.includes(t)) return true;

  // Word-level overlap: if 2+ words match, consider it related
  const tWords = t.split(" ").filter((w) => w.length > 3);
  const fWords = f.split(" ").filter((w) => w.length > 3);
  const overlap = tWords.filter((w) => fWords.includes(w));
  if (overlap.length >= 1 && fWords.length <= 3) return true;
  if (overlap.length >= 2) return true;

  return false;
}

function isInitialTask(taskTitle: string, initialFeatures: string[]): boolean {
  if (initialFeatures.length === 0) return true; // no features = treat all as initial
  return initialFeatures.some((f) => fuzzyMatch(taskTitle, f));
}

function isExpansionTask(taskTitle: string, initialFeatures: string[], currentFeatures: string[]): boolean {
  if (initialFeatures.length === 0 || currentFeatures.length === 0) return false;

  const addedFeatures = currentFeatures.filter((f) => !initialFeatures.includes(f));
  if (addedFeatures.length === 0) return false;

  // Is this task related to an added feature?
  const relatedToAdded = addedFeatures.some((f) => fuzzyMatch(taskTitle, f));

  // Make sure it's NOT also related to an initial feature (initial takes priority)
  const relatedToInitial = initialFeatures.some((f) => fuzzyMatch(taskTitle, f));

  return relatedToAdded && !relatedToInitial;
}

export function evaluateSaturation(
  signals: SignalBreakdown,
  tasks: Task[],
  initialFeatures: string[],
  currentFeatures: string[],
): SaturationState {
  const waiting    = signalSaturation(signals.waiting,     "Waiting Bottlenecks", "⏳");
  const scopeDrift = signalSaturation(signals.scope_drift, "Scope Drift",         "📈");

  const isBlocked = waiting.level === "SATURATED" || scopeDrift.level === "SATURATED";
  const isWarning = !isBlocked && (waiting.level === "WARNING" || scopeDrift.level === "WARNING");

  // Count completion of initial tasks
  const initialTasks = tasks.filter((t) => isInitialTask(t.title, initialFeatures));
  const total        = initialTasks.length > 0 ? initialTasks.length : tasks.length;
  const done         = initialTasks.length > 0
    ? initialTasks.filter((t) => t.status === "Done").length
    : tasks.filter((t) => t.status === "Done").length;

  const initialCompletionRate = total > 0 ? done / total : 1;
  const completionGatePassed  = initialCompletionRate >= SATURATION_THRESHOLDS.INITIAL_COMPLETION_GATE;

  const addedCount = currentFeatures.filter((f) => !initialFeatures.includes(f)).length;

  let blockReason: string | null = null;

  if (isBlocked) {
    const parts = [
      waiting.level    === "SATURATED" ? `Waiting (${waiting.score}/100)`         : null,
      scopeDrift.level === "SATURATED" ? `Scope Drift (${scopeDrift.score}/100)`  : null,
    ].filter(Boolean).join(" & ");

    blockReason =
      `🚨 ${parts} reached saturation. ` +
      `New tasks are held until ${Math.round(SATURATION_THRESHOLDS.INITIAL_COMPLETION_GATE * 100)}% ` +
      `of initial work is Done (currently ${Math.round(initialCompletionRate * 100)}%). ` +
      (addedCount > 0 ? `${addedCount} expansion feature(s) are queued and frozen.` : "");
  } else if (isWarning && !completionGatePassed) {
    blockReason =
      `⚠️ Signals are elevated. Focus on initial tasks before expanding scope ` +
      `(${Math.round(initialCompletionRate * 100)}% done, target ${Math.round(SATURATION_THRESHOLDS.INITIAL_COMPLETION_GATE * 100)}%).`;
  }

  return {
    waiting,
    scope_drift: scopeDrift,
    isBlocked,
    isWarning,
    initialCompletionRate,
    completionGatePassed,
    blockReason,
  };
}

export function gateTasksBySignal(
  prioritized: PrioritizedTask[],
  saturation: SaturationState,
  initialFeatures: string[],
  currentFeatures: string[],
): GatedTaskList {
  // If signals are clear, nothing to gate
  if (!saturation.isBlocked && !saturation.isWarning) {
    return { active: prioritized, held: [], saturation };
  }

  const active: PrioritizedTask[] = [];
  const held: PrioritizedTask[]   = [];

  for (const task of prioritized) {
    // Done tasks are never held
    if (task.status === "Done") {
      active.push(task);
      continue;
    }

    const expansion = isExpansionTask(task.title, initialFeatures, currentFeatures);

    if (saturation.isBlocked) {
      if (expansion) {
        held.push({
          ...task,
          reason: `[HELD] ${task.reason} — frozen until ${Math.round(SATURATION_THRESHOLDS.INITIAL_COMPLETION_GATE * 100)}% initial completion.`,
        });
      } else {
        active.push(task);
      }
    } else if (saturation.isWarning) {
      if (expansion && (task.priority === "MEDIUM" || task.priority === "LOW")) {
        held.push({
          ...task,
          reason: `[QUEUED] ${task.reason} — deprioritised while signals are elevated.`,
        });
      } else {
        active.push(task);
      }
    }
  }

  // Safety net: if ALL non-done tasks ended up held (bad feature mapping),
  // move them back to active so the dashboard isn't empty
  const nonDoneActive = active.filter((t) => t.status !== "Done");
  if (nonDoneActive.length === 0 && held.length > 0) {
    console.warn("[FlowGuard] All tasks were held — feature mapping too aggressive. Releasing held tasks to active.");
    return { active: [...active, ...held], held: [], saturation };
  }

  return { active, held, saturation };
}

export function generateSaturationInsights(saturation: SaturationState): string[] {
  const insights: string[] = [];
  if (saturation.isBlocked) {
    if (saturation.waiting.level === "SATURATED")
      insights.push(
        `Waiting signal is at ${saturation.waiting.score}/100 — queue is saturated. ` +
        `No new tasks should start until bottlenecks are resolved.`
      );
    if (saturation.scope_drift.level === "SATURATED")
      insights.push(
        `Scope Drift is at ${saturation.scope_drift.score}/100 — project has grown beyond safe limits. ` +
        `Scope additions are frozen until initial deliverables reach ${Math.round(SATURATION_THRESHOLDS.INITIAL_COMPLETION_GATE * 100)}% completion.`
      );
    insights.push(
      `Initial task completion: ${Math.round(saturation.initialCompletionRate * 100)}%. ` +
      `Hold gate lifts automatically at ${Math.round(SATURATION_THRESHOLDS.INITIAL_COMPLETION_GATE * 100)}%.`
    );
  } else if (saturation.isWarning) {
    insights.push(
      `Signals approaching saturation. Lower-priority expansion work has been queued. ` +
      `Resolve bottlenecks now to avoid a full hold.`
    );
  }
  return insights;
}

export function generateSaturationRecommendations(saturation: SaturationState): string[] {
  const recs: string[] = [];
  if (saturation.isBlocked) {
    recs.push("🔒 Enforce scope freeze immediately — no new features until hold gate clears.");
    recs.push("🎯 Assign every blocked/stale task a dedicated owner with a 48-hour deadline.");
    if (saturation.waiting.level === "SATURATED")
      recs.push("⏳ Run a daily 15-min unblocking standup targeting the approval chain.");
    if (saturation.scope_drift.level === "SATURATED")
      recs.push("📋 Move all held expansion tasks to v-next backlog and notify stakeholders.");
    recs.push(`📊 Track completion daily — must reach ${Math.round(SATURATION_THRESHOLDS.INITIAL_COMPLETION_GATE * 100)}% before new work is admitted.`);
  } else if (saturation.isWarning) {
    recs.push("⚠️ Signals elevated — deprioritise new scope until current work stabilises.");
    recs.push("🔍 Do not start queued expansion tasks until next sprint review.");
  }
  return recs;
}