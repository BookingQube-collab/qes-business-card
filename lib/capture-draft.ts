import type { LeadFormValues } from "@/components/qes/LeadForm";

const DRAFT_KEY = "qes-capture-draft-v1";

export type CaptureDraft = {
  formValues: LeadFormValues;
  step: "pick" | "preview" | "reading" | "form";
};

export function loadCaptureDraft(): CaptureDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CaptureDraft;
  } catch {
    return null;
  }
}

export function saveCaptureDraft(draft: CaptureDraft): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota errors
  }
}

export function clearCaptureDraft(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
