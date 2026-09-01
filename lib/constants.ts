import type { Interest, Owner, Priority } from "@/types/lead";

export const INTERESTS: Interest[] = [
  "WhatsApp AI",
  "Contact Center",
  "FEC Solutions",
  "Events",
  "Partnership",
  "Other",
];

export const PRIORITIES: Priority[] = ["Hot", "Warm", "Cold"];

export const OWNERS: Owner[] = ["Rajan", "Nicole", "Waqar", "Mary"];

/** DB requires owner; booth UI no longer collects it. */
export const DEFAULT_OWNER: Owner = "Rajan";

export const EVENT_NAME = "Qatar Event Show 2026";
export const BOOTH = "Booth D14";
export const APP_TITLE = "QES Business Card Leads";

export const DEFAULT_FILTERS = {
  search: "",
  priority: "All" as const,
  interest: "All" as const,
  owner: "All" as const,
  date: "All" as const,
};
