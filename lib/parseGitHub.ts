// lib/parseGitHub.ts
import { GitCommit } from "./sampleData";

interface RawCommitRow {
  sha?: string;
  hash?: string;
  author?: string;
  author_name?: string;
  date?: string;
  authored_date?: string;
  message?: string;
  commit_message?: string;
}

/* =========================
   CSV PARSER
========================= */

function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .split("\n");

  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map((h) =>
    h.toLowerCase().trim().replace(/\s+/g, "_")
  );

  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = splitCSVLine(line);
    const row: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j]?.trim() ?? "";
    }

    rows.push(row);
  }

  return rows;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/* =========================
   PARSE GITHUB CSV
========================= */

export function parseGitHubCSV(csvText: string): GitCommit[] {
  const rows = parseCSV(csvText) as RawCommitRow[];

  const commits: GitCommit[] = [];

  for (const row of rows) {
    const dateValue = row.date ?? row.authored_date ?? "";
    const parsedDate = new Date(dateValue);

    if (isNaN(parsedDate.getTime())) continue;

    commits.push({
      sha: row.sha ?? row.hash ?? "unknown",
      author: row.author ?? row.author_name ?? "Unknown",
      date: dateValue,
      message: row.message ?? row.commit_message ?? "",
    });
  }

  return commits;
}

/* =========================
   COMMIT VELOCITY
========================= */

export function getCommitVelocity(commits: GitCommit[]): {
  weeklyCommits: { week: string; count: number }[];
  velocityDropPercent: number;
} {
  if (!commits.length) {
    return { weeklyCommits: [], velocityDropPercent: 0 };
  }

  const sorted = [...commits].sort(
    (a, b) =>
      new Date(a.date).getTime() -
      new Date(b.date).getTime()
  );

  const weekMap = new Map<string, number>();

  for (const commit of sorted) {
    const d = new Date(commit.date);
    if (isNaN(d.getTime())) continue;

    const weekStart = getWeekStart(d);
    weekMap.set(weekStart, (weekMap.get(weekStart) ?? 0) + 1);
  }

  const weeklyCommits: { week: string; count: number }[] = [];

  const weekEntries = Array.from(weekMap);
  weekEntries.sort((a, b) => a[0].localeCompare(b[0]));

  for (let i = 0; i < weekEntries.length; i++) {
    weeklyCommits.push({
      week: `W${i + 1}`,
      count: weekEntries[i][1],
    });
  }

  const mid = Math.floor(weeklyCommits.length / 2);
  if (mid === 0) {
    return { weeklyCommits, velocityDropPercent: 0 };
  }

  const firstHalfAvg =
    weeklyCommits
      .slice(0, mid)
      .reduce((s, w) => s + w.count, 0) / mid;

  const secondHalfAvg =
    weeklyCommits
      .slice(mid)
      .reduce((s, w) => s + w.count, 0) /
    (weeklyCommits.length - mid);

  const velocityDropPercent =
    firstHalfAvg > 0
      ? Math.max(
          0,
          Math.round(
            ((firstHalfAvg - secondHalfAvg) /
              firstHalfAvg) *
              100
          )
        )
      : 0;

  return { weeklyCommits, velocityDropPercent };
}

/* =========================
   RISK SIGNALS
========================= */

export function getRiskyCommitSignals(
  commits: GitCommit[]
): {
  hotfixCount: number;
  wipCount: number;
  daysSinceLastCommit: number;
  mostActiveAuthor: string;
  silentAuthors: string[];
} {
  if (!commits.length) {
    return {
      hotfixCount: 0,
      wipCount: 0,
      daysSinceLastCommit: 0,
      mostActiveAuthor: "",
      silentAuthors: [],
    };
  }

  const RISKY_KEYWORDS = [
    "hotfix",
    "fix",
    "bug",
    "wip",
    "revert",
    "broken",
    "urgent",
  ];

  const WIP_KEYWORDS = [
    "wip",
    "work in progress",
    "incomplete",
  ];

  let hotfixCount = 0;
  let wipCount = 0;

  const authorLastCommit = new Map<string, Date>();
  const authorCommitCount = new Map<string, number>();

  for (const commit of commits) {
    const lower = commit.message.toLowerCase();

    if (RISKY_KEYWORDS.some((kw) => lower.includes(kw))) {
      hotfixCount++;
    }

    if (WIP_KEYWORDS.some((kw) => lower.includes(kw))) {
      wipCount++;
    }

    const d = new Date(commit.date);
    if (isNaN(d.getTime())) continue;

    const existing = authorLastCommit.get(commit.author);
    if (!existing || d > existing) {
      authorLastCommit.set(commit.author, d);
    }

    authorCommitCount.set(
      commit.author,
      (authorCommitCount.get(commit.author) ?? 0) + 1
    );
  }

  let mostActiveAuthor = "";
  let maxCommits = 0;

  const authorEntries = Array.from(authorCommitCount);
  for (let i = 0; i < authorEntries.length; i++) {
    const author = authorEntries[i][0];
    const count = authorEntries[i][1];

    if (count > maxCommits) {
      maxCommits = count;
      mostActiveAuthor = author;
    }
  }

  let latestDate = new Date(0);
  const lastCommitDates = Array.from(authorLastCommit.values());

  for (let i = 0; i < lastCommitDates.length; i++) {
    if (lastCommitDates[i] > latestDate) {
      latestDate = lastCommitDates[i];
    }
  }

  const now = new Date();
  const diffMs = now.getTime() - latestDate.getTime();

  const daysSinceLastCommit =
    diffMs > 0
      ? Math.round(diffMs / (1000 * 60 * 60 * 24))
      : 0;

  const silentAuthors: string[] = [];
  const authorLastEntries = Array.from(authorLastCommit);

  for (let i = 0; i < authorLastEntries.length; i++) {
    const author = authorLastEntries[i][0];
    const date = authorLastEntries[i][1];

    const days =
      (now.getTime() - date.getTime()) /
      (1000 * 60 * 60 * 24);

    if (days > 7) {
      silentAuthors.push(author);
    }
  }

  return {
    hotfixCount,
    wipCount,
    daysSinceLastCommit,
    mostActiveAuthor,
    silentAuthors,
  };
}

/* =========================
   WEEK HELPER
========================= */

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}