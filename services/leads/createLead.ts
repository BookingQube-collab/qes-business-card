import { createClient } from "@/lib/supabase/client";
import { createId } from "@/lib/lead-utils";
import { mapLeadRow, type LeadRow } from "@/services/leads/types";
import type { CreateLeadInput, Lead } from "@/types/lead";

export type CreateLeadOptions = {
  /** Compressed card file (WebP or JPEG). */
  cardFile?: File | Blob | null;
  /** Prefer this UUID so storage path matches the row id. */
  id?: string;
};

function storagePathFor(leadId: string, ext: "webp" | "jpg"): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `business-cards/${year}/${month}/${leadId}/card.${ext}`;
}

export async function createLead(
  input: CreateLeadInput,
  options: CreateLeadOptions = {},
): Promise<Lead> {
  const supabase = createClient();
  const leadId = options.id ?? createId();
  let imagePath = input.business_card_image;

  if (options.cardFile) {
    const type = options.cardFile.type || "image/webp";
    const ext = type.includes("jpeg") || type.includes("jpg") ? "jpg" : "webp";
    const path = storagePathFor(leadId, ext);
    const { error: uploadError } = await supabase.storage
      .from("business-cards")
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
      owner: input.owner,
      notes: input.notes,
      business_card_image: imagePath,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapLeadRow(data as LeadRow);
}
