// lib/prioritizeTasks.ts
// Scores and ranks tasks by urgency, impact, and saturation awareness.
// Expansion tasks (added to scope after kickoff) get penalized when
// waiting/scope-drift signals are elevated.

import { Task, PrioritizedTask } from "./sampleData";

export function prioritizeTasks(
  tasks: Task[],
  initialFeatures: string[] = [],
  waitingSignal: number = 0,
  scopeDriftSignal: number = 0,
): PrioritizedTask[] {
  const SIGNAL_ELEVATED  = waitingSignal >= 60 || scopeDriftSignal >= 60;
  const SIGNAL_SATURATED = waitingSignal >= 80 || scopeDriftSignal >= 80;

  // Expansion = any task whose title doesn't match any initial feature
  const isExpansion = (title: string) =>
    initialFeatures.length > 0 &&
    !initialFeatures.some(
      (f) =>
        title.toLowerCase().includes(f.toLowerCase()) ||
        f.toLowerCase().includes(title.toLowerCase().split(" ")[0])
    );

  const scored = tasks.map((task) => {
    let score = 0;
    let reason = "";

    // How many tasks does this block?
    const blocksCount = task.blocks?.length ?? 0;
    score += blocksCount * 25;
    if (blocksCount > 0) reason += `Blocks ${blocksCount} other task(s). `;

    // Is it blocked itself?
    if (task.status === "Blocked") {
      score += 30;
      reason += "Currently blocked — needs immediate unblocking. ";
    }

    // How long idle?
    if (task.last_updated_days_ago > 7) {
      score += 20;
      reason += `Idle for ${task.last_updated_days_ago} days. `;
    } else if (task.last_updated_days_ago > 3) {
      score += 10;
      reason += `Stale for ${task.last_updated_days_ago} days. `;
    }

    // Large estimated work
    if (task.status !== "Done" && (task.estimated_hours ?? 0) > 20) {
      score += 15;
      reason += `Large task (${task.estimated_hours}h estimated). `;
    }

    // Not started but big scope
    if (task.status === "Not Started" && (task.estimated_hours ?? 0) > 15) {
      score += 20;
      reason += "Not started — high effort task needs to begin now. ";
    }

    // Done = lowest priority
    if (task.status === "Done") {
      score = -100;
      reason = "Already completed.";
    }

    // Saturation-aware penalty for expansion tasks
    if (task.status !== "Done" && isExpansion(task.title)) {
      if (SIGNAL_SATURATED) {
        score -= 40;
        reason += "⚠ Expansion task — penalised: signals saturated, complete initial work first. ";
      } else if (SIGNAL_ELEVATED) {
        score -= 20;
        reason += "⚠ Expansion task — de-prioritised: signals elevated. ";
      }
    }

    // Priority label
    let priority: PrioritizedTask["priority"];
    if (score >= 60)      priority = "CRITICAL";
    else if (score >= 35) priority = "HIGH";
    else if (score >= 15) priority = "MEDIUM";
    else                  priority = "LOW";

    return {
      title:        task.title,
      assigned_to:  task.assigned_to,
      priority,
      reason:       reason.trim() || "Normal priority task.",
      status:       task.status,
      blocks_count: blocksCount,
      days_idle:    task.last_updated_days_ago,
      _score:       score,
    };
  });

  return scored
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...task }) => task);
}