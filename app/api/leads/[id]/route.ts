import { NextResponse } from "next/server";
import { isBoothAuthed } from "@/lib/booth-auth";
import { dbUpdateLead } from "@/services/leads/db";
import type { UpdateLeadInput } from "@/types/lead";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isBoothAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const input = (await request.json()) as UpdateLeadInput;
    const lead = await dbUpdateLead(id, input);
    return NextResponse.json({ lead });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update lead";
    const status = /not configured/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
