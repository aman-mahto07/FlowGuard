// lib/sampleData.ts
// Core data types used across the entire app

export interface Task {
  title: string;
  assigned_to: string;
  last_updated_days_ago: number;
  status: "Done" | "In Progress" | "Blocked" | "Not Started";
  estimated_hours?: number;
  priority_score?: number;
  blocks?: string[]; // titles of tasks this one blocks
}

export interface GitCommit {
  sha: string;
  author: string;
  date: string; // YYYY-MM-DD
  message: string;
}

export interface WhatsAppMessage {
  date: string;
  author: string;
  text: string;
}

export interface BudgetItem {
  item: string;
  budgeted_hours: number;
  spent_hours: number;
  cost_per_hour: number;
  status: "Active" | "Blocked" | "Cut" | "Done";
}

export interface ProjectData {
  project_name: string;
  release_date: string;
  initial_features: string[];
  current_features: string[];
  tasks: Task[];
  messages: string[];
  commits?: GitCommit[];
  whatsapp_messages?: WhatsAppMessage[];
  budget_items?: BudgetItem[];
}

export interface AnalysisResult {
  // Core scores
  delay_risk_score: number;
  waiting_score: number;
  scope_drift_score: number;
  scope_growth_percent: number;

  // New: deadline probability
  deadline_extension_probability: number;
  confidence: "Low" | "Medium" | "High";

  // New: prioritized task list
  prioritized_tasks: PrioritizedTask[];

  // New: financial signals
  budget_burn_percent: number;
  time_remaining_percent: number;
  wasted_hours: number;
  financial_risk: "Low" | "Medium" | "High";

  // Signal breakdown (for chart)
  signals: SignalBreakdown;

  // AI outputs
  insights: string[];
  recommendations: string[];

  ai_powered: boolean;

  // Saturation gating (new)
  held_tasks?: PrioritizedTask[];
  saturation?: import("./saturationEngine").SaturationState;
}


export interface PrioritizedTask {
  title: string;
  assigned_to: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  status: string;
  blocks_count: number;
  days_idle: number;
}

export interface SignalBreakdown {
  waiting: number;
  scope_drift: number;
  commit_velocity: number;
  budget_burn: number;
  communication_gap: number;
}

// ── Sample data for demo ─────────────────────────────────

export const sampleProject: ProjectData = {
  project_name: "Apollo Platform v2.0",
  release_date: "2025-03-15",
  initial_features: [
    "User Authentication", "Dashboard",
    "Payments Integration", "Notifications", "Settings Page"
  ],
  current_features: [
    "User Authentication", "Dashboard", "Payments Integration",
    "Notifications", "Settings Page", "Dark Mode",
    "Analytics Module", "AI Recommendations", "Export to CSV",
    "Team Collaboration"
  ],
  tasks: [
    { title: "Implement Payments API", assigned_to: "Dev A", last_updated_days_ago: 6, status: "Blocked", estimated_hours: 20, blocks: ["Deploy to staging", "Stripe webhook handling"] },
    { title: "Design new Dashboard UI", assigned_to: "Designer B", last_updated_days_ago: 8, status: "In Progress", estimated_hours: 15 },
    { title: "Write unit tests for Auth", assigned_to: "Dev C", last_updated_days_ago: 2, status: "In Progress", estimated_hours: 8 },
    { title: "Deploy to staging", assigned_to: "DevOps D", last_updated_days_ago: 5, status: "Not Started", estimated_hours: 4 },
    { title: "Analytics Module Backend", assigned_to: "Dev A", last_updated_days_ago: 9, status: "Not Started", estimated_hours: 30 },
    { title: "User onboarding flow", assigned_to: "Dev B", last_updated_days_ago: 1, status: "Done", estimated_hours: 10 },
    { title: "Stripe webhook handling", assigned_to: "Dev C", last_updated_days_ago: 4, status: "Blocked", estimated_hours: 12 },
    { title: "AI Recommendations engine", assigned_to: "Dev D", last_updated_days_ago: 12, status: "Not Started", estimated_hours: 40 },
  ],
  messages: [
    "Waiting for design approval on the new dashboard screens",
    "Blocked by backend API cant proceed until Stripe webhooks are done",
    "Can we also add an analytics dashboard PM just requested it",
    "Payment flow is pending QA sign-off",
    "Need approval from legal before we ship the AI features",
    "Still waiting on the API keys from the third-party service",
    "Dark mode design is blocked pending brand guidelines approval",
    "Release might slip if analytics backend is not started this week",
  ],
  commits: [
    { sha: "a1b2c3", author: "Dev A", date: "2025-01-05", message: "feat: initial auth setup" },
    { sha: "b2c3d4", author: "Dev B", date: "2025-01-07", message: "feat: dashboard layout" },
    { sha: "c3d4e5", author: "Dev A", date: "2025-01-10", message: "fix: login redirect bug" },
    { sha: "d4e5f6", author: "Dev C", date: "2025-01-12", message: "feat: payments integration" },
    { sha: "e5f6g7", author: "Dev B", date: "2025-01-15", message: "feat: notifications" },
    { sha: "f6g7h8", author: "Dev A", date: "2025-01-20", message: "WIP: payments api" },
    { sha: "g7h8i9", author: "Dev C", date: "2025-01-28", message: "hotfix: auth token expiry" },
    { sha: "h8i9j0", author: "Dev B", date: "2025-02-10", message: "feat: dark mode partial" },
  ],
  budget_items: [
    { item: "Dev A", budgeted_hours: 80, spent_hours: 52, cost_per_hour: 60, status: "Blocked" },
    { item: "Dev B", budgeted_hours: 80, spent_hours: 70, cost_per_hour: 55, status: "Active" },
    { item: "Dev C", budgeted_hours: 60, spent_hours: 44, cost_per_hour: 55, status: "Active" },
    { item: "Dev D", budgeted_hours: 60, spent_hours: 12, cost_per_hour: 50, status: "Active" },
    { item: "Designer B", budgeted_hours: 40, spent_hours: 38, cost_per_hour: 50, status: "Active" },
    { item: "Dark Mode", budgeted_hours: 20, spent_hours: 23, cost_per_hour: 55, status: "Cut" },
    { item: "Analytics Module", budgeted_hours: 40, spent_hours: 5, cost_per_hour: 60, status: "Blocked" },
  ],
};

export const scopeGrowthHistory = [
  { week: "W1", features: 5 },
  { week: "W2", features: 5 },
  { week: "W3", features: 6 },
  { week: "W4", features: 7 },
  { week: "W5", features: 8 },
  { week: "W6", features: 10 },
];