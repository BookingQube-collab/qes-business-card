import { QATAR_TZ } from "@/lib/lead-utils";

/** Qatar is UTC+3 year-round (no DST). */
const QATAR_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Calendar day `YYYY-MM-DD` in Asia/Qatar. */
export function qatarDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: QATAR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Yesterday's calendar day in Asia/Qatar as `YYYY-MM-DD`. */
export function qatarYesterdayKey(now = new Date()): string {
  const todayKey = qatarDateKey(now);
  const [y, m, d] = todayKey.split("-").map(Number);
  // Noon Qatar on "today", then subtract one day — avoids DST edge cases.
  const todayNoonUtc = Date.UTC(y, m - 1, d, 12, 0, 0, 0) - QATAR_OFFSET_MS;
  return qatarDateKey(new Date(todayNoonUtc - 24 * 60 * 60 * 1000));
}

/**
 * Map a Qatar calendar day to an ISO timestamp for lead `created_at`.
 * Uses 12:00 Qatar time so the lead lands firmly on that booth day in filters.
 */
export function qatarDayToCreatedAtIso(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!match) {
    throw new Error("Invalid date — use YYYY-MM-DD");
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const utcMs = Date.UTC(y, m - 1, d, 12, 0, 0, 0) - QATAR_OFFSET_MS;
  return new Date(utcMs).toISOString();
}

export function formatQatarDateLabel(dateKey: string): string {
  try {
    const iso = qatarDayToCreatedAtIso(dateKey);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: QATAR_TZ,
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return dateKey;
  }
}
