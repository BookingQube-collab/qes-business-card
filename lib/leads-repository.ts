import { createId } from "@/lib/lead-utils";
import type {
  CreateLeadInput,
  Lead,
  UpdateLeadInput,
} from "@/types/lead";

/**
 * Repository boundary for Phase 2 (Supabase / API).
 * Phase 1 uses an in-memory LocalLeadRepository.
 */
export interface LeadRepository {
  getLeads(): Promise<Lead[]>;
  createLead(input: CreateLeadInput): Promise<Lead>;
  updateLead(id: string, input: UpdateLeadInput): Promise<Lead>;
  deleteLead(id: string): Promise<void>;
}

export class LocalLeadRepository implements LeadRepository {
  private leads: Lead[];

  constructor(initial: Lead[] = []) {
    this.leads = initial.map((l) => ({ ...l }));
  }

  async getLeads(): Promise<Lead[]> {
    return this.leads.map((l) => ({ ...l }));
  }

  async createLead(input: CreateLeadInput): Promise<Lead> {
    const now = new Date().toISOString();
    const createdAt =
      input.created_at && !Number.isNaN(Date.parse(input.created_at))
        ? new Date(input.created_at).toISOString()
        : now;
    const rest = { ...input };
    delete rest.created_at;
    const lead: Lead = {
      ...rest,
      id: createId(),
      created_at: createdAt,
      updated_at: now,
    };
    this.leads = [lead, ...this.leads];
    return { ...lead };
  }

  async updateLead(id: string, input: UpdateLeadInput): Promise<Lead> {
    const index = this.leads.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new Error(`Lead not found: ${id}`);
    }
    const updated: Lead = {
      ...this.leads[index],
      ...input,
      updated_at: new Date().toISOString(),
    };
    this.leads = [
      ...this.leads.slice(0, index),
      updated,
      ...this.leads.slice(index + 1),
    ];
    return { ...updated };
  }

  async deleteLead(id: string): Promise<void> {
    this.leads = this.leads.filter((l) => l.id !== id);
  }
}

/** Singleton local repository for Phase 1. Swap for remote in Phase 2. */
let repository: LeadRepository | null = null;

export function getLeadRepository(): LeadRepository {
  if (!repository) {
    repository = new LocalLeadRepository();
  }
  return repository;
}
