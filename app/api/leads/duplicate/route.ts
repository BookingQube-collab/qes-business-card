import { NextResponse } from "next/server";
import { isBoothAuthed } from "@/lib/booth-auth";
import { dbFindDuplicate } from "@/services/leads/db";

export async function GET(request: Request) {
  if (!(await isBoothAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const lead = await dbFindDuplicate({
      email: searchParams.get("email"),
      phone: searchParams.get("phone"),
      excludeId: searchParams.get("excludeId") || undefined,
    });
    return NextResponse.json({ lead });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not check duplicates";
    const status = /not configured/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
