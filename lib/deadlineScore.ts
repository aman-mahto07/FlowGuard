import { ProjectData, SignalBreakdown } from "./sampleData";
import { computeWaitingScore, computeScopeDriftScore } from "./scoring";
import { getCommitVelocity, getRiskyCommitSignals } from "./parseGitHub";
import { detectCommunicationGaps, countBlockingSignals } from "./parseWhatsApp";
import { computeFinancialHealth } from "./parseBudget";

export interface DeadlineAssessment {
  probability: number;
  confidence: "Low" | "Medium" | "High";
  signals: SignalBreakdown;
  time_remaining_percent: number;
  budget_burn_percent: number;
  financial_risk: "Low" | "Medium" | "High";
  wasted_hours: number;
}

export function computeDeadlineScore(data: ProjectData): DeadlineAssessment {

  // Signal 1: Waiting
  let waitingSignal = 0;
  try { waitingSignal = computeWaitingScore(data); } catch { waitingSignal = 0; }

  // Signal 2: Scope Drift
  let scopeSignal = 0;
  try {
    const { score } = computeScopeDriftScore(data);
    scopeSignal = score;
  } catch { scopeSignal = 0; }

  // Signal 3: Commit Velocity
  let commitSignal = 0;
  try {
    const commits = data.commits ?? [];
    if (commits.length > 0) {
      const { velocityDropPercent } = getCommitVelocity(commits);
      const { hotfixCount, wipCount, daysSinceLastCommit } = getRiskyCommitSignals(commits);
      commitSignal = Math.min(100,
        velocityDropPercent + hotfixCount * 5 + wipCount * 8 + Math.min(daysSinceLastCommit * 3, 30)
      );
    }
  } catch { commitSignal = 0; }

  // Signal 4: Communication Gap
  let communicationSignal = 0;
  try {
    const whatsappMsgs = data.whatsapp_messages ?? [];
    const plainMsgs = data.messages ?? [];
    if (whatsappMsgs.length > 0) {
      const maxGap = detectCommunicationGaps(whatsappMsgs);
      const blockingCount = countBlockingSignals(whatsappMsgs);
      communicationSignal = Math.min(100, maxGap * 8 + blockingCount * 4);
    } else if (plainMsgs.length > 0) {
      const KEYWORDS = ["waiting", "blocked", "pending", "approval", "delay", "stuck"];
      const hits = plainMsgs.filter((m) =>
        m && KEYWORDS.some((kw) => m.toLowerCase().includes(kw))
      ).length;
      communicationSignal = Math.min(100, hits * 12);
    }
  } catch { communicationSignal = 0; }

  // Time remaining
  let timeRemainingPercent = 50;
  try {
    const today = new Date();
    const release = new Date(data.release_date);
    if (!isNaN(release.getTime())) {
      const daysLeft = Math.max(0,
        Math.round((release.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      );
      timeRemainingPercent = Math.min(100, Math.round((daysLeft / 60) * 100));
    }
  } catch { timeRemainingPercent = 50; }

  // Signal 5: Budget
  let budgetSignal = 0;
  let budgetBurnPercent = 0;
  let financialRisk: "Low" | "Medium" | "High" = "Low";
  let wastedHours = 0;
  try {
    const budgetItems = data.budget_items ?? [];
    if (budgetItems.length > 0) {
      const fin = computeFinancialHealth(budgetItems, timeRemainingPercent);
      budgetBurnPercent = fin.burn_percent;
      financialRisk = fin.financial_risk;
      wastedHours = fin.wasted_hours;
      budgetSignal = Math.min(100,
        Math.max(0, fin.burn_percent - (100 - timeRemainingPercent)) * 2
      );
    }
  } catch { budgetSignal = 0; }

  // Count real data sources uploaded
  const sourceCount = [
    (data.commits ?? []).length > 0,
    (data.whatsapp_messages ?? []).length > 0,
    (data.budget_items ?? []).length > 0,
  ].filter(Boolean).length;

  // Weighted probability — adjusts based on how many sources we have
  let probability = 0;
  if (sourceCount === 0) {
    probability = Math.min(100, Math.round(waitingSignal * 0.60 + scopeSignal * 0.40));
  } else if (sourceCount === 1) {
    probability = Math.min(100, Math.round(
      waitingSignal * 0.35 + scopeSignal * 0.30 +
      commitSignal * 0.20 + communicationSignal * 0.15
    ));
  } else if (sourceCount === 2) {
    probability = Math.min(100, Math.round(
      waitingSignal * 0.30 + scopeSignal * 0.25 +
      commitSignal * 0.22 + communicationSignal * 0.18 + budgetSignal * 0.05
    ));
  } else {
    probability = Math.min(100, Math.round(
      waitingSignal * 0.28 + scopeSignal * 0.22 +
      commitSignal * 0.22 + communicationSignal * 0.18 + budgetSignal * 0.10
    ));
  }

  const confidence: "Low" | "Medium" | "High" =
    sourceCount >= 3 ? "High" : sourceCount === 2 ? "Medium" : "Low";

  return {
    probability,
    confidence,
    signals: {
      waiting: waitingSignal,
      scope_drift: scopeSignal,
      commit_velocity: commitSignal,
      budget_burn: budgetSignal,
      communication_gap: communicationSignal,
    },
    time_remaining_percent: timeRemainingPercent,
    budget_burn_percent: budgetBurnPercent,
    financial_risk: financialRisk,
    wasted_hours: wastedHours,
  };
}