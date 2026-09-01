import type { Lead } from "@/types/lead";

export type LeadRow = {
  id: string;
  name: string;
  company: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  interest: Lead["interest"];
  priority: Lead["priority"];
  owner: Lead["owner"];
  notes: string | null;
  business_card_image: string | null;
  created_at: string;
  updated_at: string;
};

export function mapLeadRow(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    position: row.position,
    phone: row.phone,
    email: row.email,
    interest: row.interest,
    priority: row.priority,
    owner: row.owner,
    notes: row.notes,
    business_card_image: row.business_card_image,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
