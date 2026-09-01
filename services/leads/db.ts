import { DEFAULT_OWNER } from "@/lib/constants";
import { normalizeEmail, normalizePhone } from "@/lib/lead-utils";
import { createServiceClient, hasSupabaseService } from "@/lib/supabase/server";
import { mapLeadRow, type LeadRow } from "@/services/leads/types";
import type { CreateLeadInput, Lead, UpdateLeadInput } from "@/types/lead";

const BUCKET = "business-cards";

export function assertSupabaseService() {
  if (!hasSupabaseService()) {
    throw new Error(
      "Supabase is not configured. Add project URL and service role key on the server.",
    );
  }
}

function storagePathFor(leadId: string, ext: "webp" | "jpg") {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `business-cards/${year}/${month}/${leadId}/card.${ext}`;
}

export async function dbGetLeads(limit = 400): Promise<Lead[]> {
  assertSupabaseService();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 50), 500));
  if (error) throw new Error(error.message);
  return ((data ?? []) as LeadRow[]).map(mapLeadRow);
}

function matchesDuplicate(
  lead: Lead,
  params: { email: string; phone: string; excludeId?: string },
): boolean {
  if (params.excludeId && lead.id === params.excludeId) return false;
  if (params.email && normalizeEmail(lead.email) === params.email) return true;
  if (params.phone && normalizePhone(lead.phone) === params.phone) return true;
  return false;
}

export async function dbFindDuplicate(params: {
  email?: string | null;
  phone?: string | null;
  excludeId?: string;
}): Promise<Lead | null> {
  const email = normalizeEmail(params.email);
  const phone = normalizePhone(params.phone);
  if (!email && !phone) return null;

  assertSupabaseService();
  const supabase = createServiceClient();

  if (email) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .ilike("email", email)
      .limit(20);
    if (error) throw new Error(error.message);
    const match = ((data ?? []) as LeadRow[])
      .map(mapLeadRow)
      .find((lead) => matchesDuplicate(lead, { email, phone, excludeId: params.excludeId }));
    if (match) return match;
  }

  if (phone) {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .not("phone", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const match = ((data ?? []) as LeadRow[])
      .map(mapLeadRow)
      .find((lead) => matchesDuplicate(lead, { email, phone, excludeId: params.excludeId }));
    if (match) return match;
  }

  return null;
}

export async function dbCreateLead(
  input: CreateLeadInput,
  options: { id?: string; cardFile?: File | Blob | null } = {},
): Promise<Lead> {
  assertSupabaseService();
  const supabase = createServiceClient();
  const leadId = options.id ?? crypto.randomUUID();
  let imagePath = input.business_card_image ?? null;

  if (options.cardFile) {
    const type = options.cardFile.type || "image/webp";
    const ext = type.includes("jpeg") || type.includes("jpg") ? "jpg" : "webp";
    const path = storagePathFor(leadId, ext);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, options.cardFile, {
        contentType: type,
        upsert: false,
      });
    if (uploadError) throw new Error(uploadError.message);
    imagePath = path;
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      id: leadId,
      name: input.name,
      company: input.company,
      position: input.position,
      phone: input.phone,
      email: input.email,
      interest: input.interest,
      priority: input.priority,
      owner: input.owner ?? DEFAULT_OWNER,
      notes: input.notes,
      business_card_image: imagePath,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapLeadRow(data as LeadRow);
}

export async function dbUpdateLead(
  id: string,
  input: UpdateLeadInput,
): Promise<Lead> {
  assertSupabaseService();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("leads")
    .update({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.company !== undefined ? { company: input.company } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.interest !== undefined ? { interest: input.interest } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.owner !== undefined ? { owner: input.owner } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.business_card_image !== undefined
        ? { business_card_image: input.business_card_image }
        : {}),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapLeadRow(data as LeadRow);
}

export async function dbSignedCardUrl(
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
  assertSupabaseService();
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
