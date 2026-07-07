import { BudgetItem } from "./sampleData";

type SheetRow = {
  Item?: string;
  item?: string;

  "Budgeted Hours"?: number | string;
  "budgeted hours"?: number | string;
  budgeted_hours?: number | string;

  "Spent Hours"?: number | string;
  "spent hours"?: number | string;
  spent_hours?: number | string;

  "Cost Per Hour"?: number | string;
  "cost per hour"?: number | string;
  cost_per_hour?: number | string;

  Status?: string;
  status?: string;
};

type XlsxUtils = {
  sheet_to_json: <T>(sheet: unknown, opts?: unknown) => T[];
};

type WorkBook = {
  Sheets: Record<string, unknown>;
  SheetNames: string[];
};

function findBudgetSheet(workbook: WorkBook): unknown | null {
  const sheetNames = workbook.SheetNames ?? Object.keys(workbook.Sheets);

  // 1️⃣ Exact match
  if (workbook.Sheets["Budget"]) return workbook.Sheets["Budget"];

  // 2️⃣ Case-insensitive match
  const ci = sheetNames.find(
    (n) => n.toLowerCase().trim() === "budget"
  );
  if (ci) return workbook.Sheets[ci];

  // 3️⃣ Partial match
  const partial = sheetNames.find((n) =>
    n.toLowerCase().includes("budget")
  );
  if (partial) return workbook.Sheets[partial];

  // 4️⃣ Fallback first sheet
  if (sheetNames.length > 0)
    return workbook.Sheets[sheetNames[0]];

  return null;
}

function normalizeRow(row: SheetRow): BudgetItem | null {
  const item = String(row["Item"] ?? row["item"] ?? "").trim();

  const budgeted_hours = Number(
    row["Budgeted Hours"] ??
      row["budgeted hours"] ??
      row["budgeted_hours"] ??
      0
  );

  const spent_hours = Number(
    row["Spent Hours"] ??
      row["spent hours"] ??
      row["spent_hours"] ??
      0
  );

  const cost_per_hour = Number(
    row["Cost Per Hour"] ??
      row["cost per hour"] ??
      row["cost_per_hour"] ??
      0
  );

  const status = String(
    row["Status"] ?? row["status"] ?? "Active"
  ).trim() as BudgetItem["status"];

  // Skip empty rows
  if (!item && budgeted_hours === 0 && spent_hours === 0)
    return null;

  return {
    item,
    budgeted_hours,
    spent_hours,
    cost_per_hour,
    status,
  };
}

export function parseBudgetSheet(
  workbook: WorkBook,
  utils: XlsxUtils
): BudgetItem[] {
  const sheet = findBudgetSheet(workbook);
  if (!sheet) return [];

  let rows: SheetRow[] = [];

  try {
    rows = utils.sheet_to_json<SheetRow>(sheet, {
      defval: "",
      raw: false,
    });
  } catch (err) {
    console.warn("[parseBudget] sheet_to_json failed:", err);
    return [];
  }

  const results: BudgetItem[] = [];

  for (const row of rows) {
    const normalized = normalizeRow(row);
    if (normalized) results.push(normalized);
  }

  return results;
}

export interface FinancialSummary {
  total_budgeted_cost: number;
  total_spent_cost: number;
  burn_percent: number;
  wasted_hours: number;
  wasted_cost: number;
  blocked_cost: number;
  financial_risk: "Low" | "Medium" | "High";
  top_waste_item: string;
}

export function computeFinancialHealth(
  items: BudgetItem[],
  timeRemainingPercent: number
): FinancialSummary {
  let totalBudgeted = 0;
  let totalSpent = 0;
  let wastedHours = 0;
  let wastedCost = 0;
  let blockedCost = 0;
  let topWasteItem = "";
  let maxWaste = 0;

  for (const item of items) {
    if (!item) continue;

    const budgetedCost =
      (item.budgeted_hours ?? 0) *
      (item.cost_per_hour ?? 0);

    const spentCost =
      (item.spent_hours ?? 0) *
      (item.cost_per_hour ?? 0);

    totalBudgeted += budgetedCost;
    totalSpent += spentCost;

    // CUT = wasted money
    if (item.status === "Cut") {
      const waste =
        (item.spent_hours ?? 0) *
        (item.cost_per_hour ?? 0);

      wastedHours += item.spent_hours ?? 0;
      wastedCost += waste;

      if (waste > maxWaste) {
        maxWaste = waste;
        topWasteItem = item.item;
      }
    }

    // BLOCKED = risk money
    if (item.status === "Blocked") {
      blockedCost += spentCost;
    }
  }

  const burnPercent =
    totalBudgeted > 0
      ? Math.round((totalSpent / totalBudgeted) * 100)
      : 0;

  const expectedBurn = 100 - timeRemainingPercent;
  const overBurn = burnPercent - expectedBurn;

  let financial_risk: "Low" | "Medium" | "High" = "Low";

  if (
    overBurn > 20 ||
    wastedCost > totalBudgeted * 0.1
  ) {
    financial_risk = "High";
  } else if (
    overBurn > 10 ||
    blockedCost > totalBudgeted * 0.05
  ) {
    financial_risk = "Medium";
  }

  return {
    total_budgeted_cost: totalBudgeted,
    total_spent_cost: totalSpent,
    burn_percent: burnPercent,
    wasted_hours: wastedHours,
    wasted_cost: wastedCost,
    blocked_cost: blockedCost,
    financial_risk,
    top_waste_item: topWasteItem,
  };
}