import { LocalLeadRepository, type LeadRepository } from "@/lib/leads-repository";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createLead as createLeadRemote } from "@/services/leads/createLead";
import { findDuplicateLead as findDuplicateRemote } from "@/services/leads/findDuplicateLead";
import { getLeads as getLeadsRemote, getLeadSignedUrl } from "@/services/leads/getLeads";
import { updateLead as updateLeadRemote } from "@/services/leads/updateLead";
import type { CreateLeadInput, Lead, UpdateLeadInput } from "@/types/lead";

export type LeadApi = {
  mode: "local" | "supabase";
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

let localRepo: LeadRepository | null = null;

function getLocal(): LeadRepository {
  if (!localRepo) localRepo = new LocalLeadRepository();
  return localRepo;
}

export function getLeadApi(): LeadApi {
  if (!isSupabaseConfigured()) {
    const repo = getLocal();
    return {
      mode: "local",
      getLeads: () => repo.getLeads(),
      createLead: (input) => repo.createLead(input),
      updateLead: (id, input) => repo.updateLead(id, input),
      findDuplicate: async ({ email, phone, excludeId }) => {
        const leads = await repo.getLeads();
        const { normalizeEmail, normalizePhone } = await import(
          "@/lib/lead-utils"
        );
        const e = normalizeEmail(email);
        const p = normalizePhone(phone);
        if (!e && !p) return null;
        return (
          leads.find((l) => {
            if (excludeId && l.id === excludeId) return false;
            if (e && normalizeEmail(l.email) === e) return true;
            if (p && normalizePhone(l.phone) === p) return true;
            return false;
          }) ?? null
        );
      },
      getSignedCardUrl: async (path) => path ?? null,
    };
  }

  return {
    mode: "supabase",
    getLeads: () => getLeadsRemote(),
    createLead: (input, options) => createLeadRemote(input, options),
    updateLead: (id, input) => updateLeadRemote(id, input),
    findDuplicate: (params) => findDuplicateRemote(params),
    getSignedCardUrl: (path) => getLeadSignedUrl(path),
  };
}
