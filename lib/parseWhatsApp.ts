// lib/parseWhatsApp.ts
import type { WhatsAppMessage } from "./sampleData";

// Handles common WhatsApp export formats:
// "12/02/2025, 09:14 - Dev A: message"
// "[12/02/2025, 09:14] Dev A: message"
// "12/02/2025, 9:14 am - Dev A: message"
const LINE_PATTERNS: RegExp[] = [
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s*[-–]\s+([^:]+):\s+(.+)$/i,
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\]\s+([^:]+):\s+(.+)$/i,
];

const SYSTEM_PREFIXES: string[] = [
  "messages and calls",
  "you deleted",
  "this message was deleted",
  "missed voice call",
  "missed video call",
  "<media omitted>",
  "null",
];

export function parseWhatsAppChat(chatText: string): WhatsAppMessage[] {
  const lines: string[] = chatText.split("\n");
  const messages: WhatsAppMessage[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    if (SYSTEM_PREFIXES.some((prefix) => lower.includes(prefix))) {
      continue;
    }

    for (const pattern of LINE_PATTERNS) {
      const match = trimmed.match(pattern);

      if (match && match.length >= 4) {
        const messageText = match[3]?.trim();
        const author = match[2]?.trim();
        const rawDate = match[1];

        if (messageText && author && rawDate) {
          messages.push({
            date: normalizeDate(rawDate),
            author,
            text: messageText,
          });
        }

        break; // Stop checking other patterns once matched
      }
    }
  }

  return messages;
}

function normalizeDate(raw: string): string {
  const parts = raw.split("/");

  if (parts.length !== 3) return raw;

  const [day, month, yearPart] = parts;
  const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function extractMessagesFromWhatsApp(
  msgs: WhatsAppMessage[]
): string[] {
  return msgs.map((m) => m.text);
}

export function detectCommunicationGaps(
  msgs: WhatsAppMessage[]
): number {
  if (msgs.length < 2) return 0;

  const uniqueDates: string[] = Array.from(
    new Set(msgs.map((m) => m.date))
  ).sort();

  let maxGap = 0;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);

    if (!isNaN(prevDate.getTime()) && !isNaN(currDate.getTime())) {
      const gap = Math.round(
        (currDate.getTime() - prevDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (gap > maxGap) {
        maxGap = gap;
      }
    }
  }

  return maxGap;
}

export function countBlockingSignals(
  msgs: WhatsAppMessage[]
): number {
  const KEYWORDS: string[] = [
    "waiting",
    "blocked",
    "pending",
    "approval",
    "delay",
    "stuck",
    "hold",
    "can we add",
    "scope",
    "new feature",
  ];

  let count = 0;

  for (const msg of msgs) {
    const lowerText = msg.text.toLowerCase();

    for (const keyword of KEYWORDS) {
      if (lowerText.includes(keyword)) {
        count++;
      }
    }
  }

  return count;
}