import type { CreateLeadInput, Lead, UpdateLeadInput } from "@/types/lead";

export type LeadApi = {
  mode: "supabase";
  getLeads(): Promise<Lead[]>;
  createLead(
    input: CreateLeadInput,
    options?: { cardFile?: File | Blob | null; id?: string },
  ): Promise<Lead>;
  updateLead(id: string, input: UpdateLeadInput): Promise<Lead>;
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
      const json = (await res.json().catch(() => ({}))) as {
        leads?: Lead[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Could not load leads");
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
      const json = (await res.json().catch(() => ({}))) as {
        lead?: Lead;
        error?: string;
      };
      if (!res.ok || !json.lead) {
        throw new Error(json.error || "Could not save lead");
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
      const json = (await res.json().catch(() => ({}))) as {
        lead?: Lead;
        error?: string;
      };
      if (!res.ok || !json.lead) {
        throw new Error(json.error || "Could not update lead");
      }
      return json.lead;
    },
    async findDuplicate({ email, phone, excludeId }) {
      const params = new URLSearchParams();
      if (email) params.set("email", email);
      if (phone) params.set("phone", phone);
      if (excludeId) params.set("excludeId", excludeId);
      const res = await fetch(`/api/leads/duplicate?${params}`, {
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        lead?: Lead | null;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Could not check duplicates");
      return json.lead ?? null;
    },
    async getSignedCardUrl(path) {
      if (!path) return null;
      const params = new URLSearchParams({ path });
      const res = await fetch(`/api/leads/signed-url?${params}`, {
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        url?: string | null;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Could not load card image");
      return json.url ?? null;
    },
  };
}
