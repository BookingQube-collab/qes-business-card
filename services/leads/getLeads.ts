import { createClient } from "@/lib/supabase/client";
import { mapLeadRow, type LeadRow } from "@/services/leads/types";
import type { Lead } from "@/types/lead";

const DEFAULT_LIMIT = 300;

function mapSupabaseError(message: string): Error {
  if (/invalid api key/i.test(message)) {
    return new Error(
      "Invalid Supabase API key. Use the legacy JWT anon key (eyJ…) from Project Settings → API (not sb_publishable), then restart the dev server.",
    );
  }
  return new Error(message);
}

export async function getLeads(limit = DEFAULT_LIMIT): Promise<Lead[]> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 200), 500));

  if (error) throw mapSupabaseError(error.message);
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
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Not signed in");
  }

  const { data, error } = await supabase.storage
    .from("business-cards")
    .createSignedUrl(path, expiresIn);

  if (error) throw mapSupabaseError(error.message);
  return data.signedUrl;
}
