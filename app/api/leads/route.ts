import { NextResponse } from "next/server";
import { isBoothAuthed } from "@/lib/booth-auth";
import { dbCreateLead, dbGetLeads } from "@/services/leads/db";
import type { CreateLeadInput } from "@/types/lead";

async function requireAuth() {
  if (await isBoothAuthed()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function fail(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  const status = /not configured/i.test(message) ? 503 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const leads = await dbGetLeads();
    return NextResponse.json({ leads });
  } catch (err) {
    return fail(err, "Could not load leads");
  }
}

export async function POST(request: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  try {
    const form = await request.formData();
    const raw = form.get("payload");
    if (typeof raw !== "string") {
      return NextResponse.json({ error: "Missing lead payload" }, { status: 400 });
    }
    const input = JSON.parse(raw) as CreateLeadInput;
    const id = typeof form.get("id") === "string" ? String(form.get("id")) : undefined;
    const card = form.get("card");
    const cardFile =
      card instanceof Blob && card.size > 0 ? card : null;

    const lead = await dbCreateLead(input, { id, cardFile });
    return NextResponse.json({ lead });
  } catch (err) {
    return fail(err, "Could not save lead");
  }
}
