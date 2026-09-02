import type { CreateLeadInput, Lead, UpdateLeadInput } from "@/types/lead";

export class LeadApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LeadApiError";
    this.status = status;
  }
}

async function parseLeadResponse<T>(
  res: Response,
  fallback: string,
): Promise<T & { error?: string }> {
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new LeadApiError(json.error || fallback, res.status);
  }
  return json;
}

export type LeadApi = {
  mode: "supabase";
  getLeads(): Promise<Lead[]>;
  createLead(
    input: CreateLeadInput,
    options?: { cardFile?: File | Blob | null; id?: string },
  ): Promise<Lead>;
  updateLead(id: string, input: UpdateLeadInput): Promise<Lead>;
  deleteLead(id: string): Promise<void>;
  findDuplicate(params: {
    email?: string | null;
    phone?: string | null;
    excludeId?: string;
  }): Promise<Lead | null>;
  getSignedCardUrl(path: string | null | undefined): Promise<string | null>;
};

export function getLeadApi(): LeadApi {
  return {
    mode: "supabase",
    async getLeads() {
      const res = await fetch("/api/leads", { credentials: "include" });
      const json = await parseLeadResponse<{ leads?: Lead[] }>(
        res,
        "Could not load leads",
      );
      return json.leads ?? [];
    },
    async createLead(input, options = {}) {
      const body = new FormData();
      body.append("payload", JSON.stringify(input));
      if (options.id) body.append("id", options.id);
      if (options.cardFile) {
        body.append(
          "card",
          options.cardFile,
          options.cardFile instanceof File
            ? options.cardFile.name
            : "card.webp",
        );
      }
      const res = await fetch("/api/leads", {
        method: "POST",
        body,
        credentials: "include",
      });
      const json = await parseLeadResponse<{ lead?: Lead }>(
        res,
        "Could not save lead",
      );
      if (!json.lead) {
        throw new LeadApiError("Could not save lead", res.status);
      }
      return json.lead;
    },
    async updateLead(id, input) {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const json = await parseLeadResponse<{ lead?: Lead }>(
        res,
        "Could not update lead",
      );
      if (!json.lead) {
        throw new LeadApiError("Could not update lead", res.status);
      }
      return json.lead;
    },
    async deleteLead(id) {
      const res = await fetch(`/api/leads/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      await parseLeadResponse<{ ok?: boolean }>(res, "Could not delete lead");
    },
    async findDuplicate({ email, phone, excludeId }) {
      const params = new URLSearchParams();
      if (email?.trim()) params.set("email", email.trim());
      if (phone?.trim()) params.set("phone", phone.trim());
      if (excludeId) params.set("excludeId", excludeId);
      const res = await fetch(`/api/leads/duplicate?${params}`, {
        credentials: "include",
      });
      const json = await parseLeadResponse<{ lead?: Lead | null }>(
        res,
        "Could not check duplicates",
      );
      return json.lead ?? null;
    },
    async getSignedCardUrl(path) {
      if (!path) return null;
      const params = new URLSearchParams({ path });
      const res = await fetch(`/api/leads/signed-url?${params}`, {
        credentials: "include",
      });
      const json = await parseLeadResponse<{ url?: string | null }>(
        res,
        "Could not load card image",
      );
      return json.url ?? null;
    },
  };
}
