import { createClient } from "@/lib/supabase/client";
import { normalizeEmail, normalizePhone } from "@/lib/lead-utils";
import { mapLeadRow, type LeadRow } from "@/services/leads/types";
import type { Lead } from "@/types/lead";

export async function findDuplicateLead(params: {
  email?: string | null;
  phone?: string | null;
  excludeId?: string;
}): Promise<Lead | null> {
  const email = normalizeEmail(params.email);
  const phone = normalizePhone(params.phone);
  if (!email && !phone) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LeadRow[];
  const match = rows.find((row) => {
    if (params.excludeId && row.id === params.excludeId) return false;
    const rowEmail = normalizeEmail(row.email);
    const rowPhone = normalizePhone(row.phone);
    if (email && rowEmail && email === rowEmail) return true;
    if (phone && rowPhone && phone === rowPhone) return true;
    return false;
  });

  return match ? mapLeadRow(match) : null;
}
