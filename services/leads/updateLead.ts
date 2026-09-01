import { createClient } from "@/lib/supabase/client";
import { mapLeadRow, type LeadRow } from "@/services/leads/types";
import type { Lead, UpdateLeadInput } from "@/types/lead";

export async function updateLead(
  id: string,
  input: UpdateLeadInput,
): Promise<Lead> {
  const supabase = createClient();
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
