import type {
  Lead,
  LeadFilters,
  LeadStats,
  Priority,
} from "@/types/lead";

export const QATAR_TZ = "Asia/Qatar";

const CARD_PALETTES: [string, string][] = [
  ["#22d3ee", "#8b5cf6"],
  ["#f0369b", "#ff8a3d"],
  ["#8b5cf6", "#f0369b"],
  ["#22d3ee", "#4ade80"],
  ["#ff8a3d", "#f0369b"],
  ["#38bdf8", "#8b5cf6"],
];

export function leadHue(seed: string): [string, string] {
  let h = 0;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 997;
  }
  return CARD_PALETTES[h % CARD_PALETTES.length];
}

function qatarParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: QATAR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour12: parts.hour,
    minute: parts.minute,
    dayPeriod: parts.dayPeriod,
  };
}

function qatarDayKey(date: Date): string {
  const p = qatarParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

function startOfQatarDayMs(now = new Date()): number {
  const key = qatarDayKey(now);
  // Approximate: find a Date that formats to this Qatar day at midnight via binary search
  // Simpler: use noon UTC of calendar parts derived from Qatar and adjust
  const [y, m, d] = key.split("-").map(Number);
  // Qatar is UTC+3 year-round
  return Date.UTC(y, m - 1, d, -3, 0, 0, 0);
}

export function computeStats(leads: Lead[]): LeadStats {
  const todayKey = qatarDayKey(new Date());

  return {
    total: leads.length,
    today: leads.filter((l) => qatarDayKey(new Date(l.created_at)) === todayKey)
      .length,
    hot: leads.filter((l) => l.priority === "Hot").length,
  };
}

export function filterLeads(leads: Lead[], filters: LeadFilters): Lead[] {
  const q = filters.search.trim().toLowerCase();
  const now = new Date();
  const todayStart = startOfQatarDayMs(now);
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;

  return leads.filter((lead) => {
    if (filters.priority !== "All" && lead.priority !== filters.priority) {
      return false;
    }
    if (filters.interest !== "All" && lead.interest !== filters.interest) {
      return false;
    }
    if (filters.owner !== "All" && lead.owner !== filters.owner) {
      return false;
    }

    if (filters.date !== "All") {
      const created = new Date(lead.created_at).getTime();
      if (filters.date === "Today" && created < todayStart) return false;
      if (
        filters.date === "Yesterday" &&
        (created < yesterdayStart || created >= todayStart)
      ) {
        return false;
      }
      if (filters.date === "This Week" && created < weekStart) return false;
    }

    if (!q) return true;

    const haystack = [
      lead.name,
      lead.company,
      lead.position ?? "",
      lead.phone ?? "",
      lead.email ?? "",
      lead.notes ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function formatLeadTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const p = qatarParts(date);
  const time = `${p.hour12}:${p.minute} ${p.dayPeriod}`;

  if (qatarDayKey(date) === qatarDayKey(now)) {
    return `Today ${time}`;
  }

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (qatarDayKey(date) === qatarDayKey(yesterday)) {
    return `Yesterday ${time}`;
  }

  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: QATAR_TZ,
    month: "short",
    day: "numeric",
  }).format(date);

  return `${short} ${time}`;
}

export function formatFullDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: QATAR_TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function priorityClass(priority: Priority): string {
  switch (priority) {
    case "Hot":
      return "bg-[#fff1f2] text-[#c2185b] border-[#fbcfe0]";
    case "Warm":
      return "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]";
    case "Cold":
      return "bg-[#f0fdff] text-[#0e7490] border-[#cffafe]";
  }
}

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function normalizePhone(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
