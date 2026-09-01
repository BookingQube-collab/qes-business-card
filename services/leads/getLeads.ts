import { createClient } from "@/lib/supabase/client";
import { mapLeadRow, type LeadRow } from "@/services/leads/types";
import type { Lead } from "@/types/lead";

const DEFAULT_LIMIT = 300;

export async function getLeads(limit = DEFAULT_LIMIT): Promise<Lead[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 200), 500));

  if (error) throw new Error(error.message);
  return ((data ?? []) as LeadRow[]).map(mapLeadRow);
}

export async function getLeadSignedUrl(
  path: string | null | undefined,
  expiresIn = 60 * 30,
): Promise<string | null> {
  if (!path) return null;
  if (
    path.startsWith("http") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("business-cards")
    .createSignedUrl(path, expiresIn);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}
