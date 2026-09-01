import { NextResponse } from "next/server";
import { isBoothAuthed } from "@/lib/booth-auth";
import { dbSignedCardUrl } from "@/services/leads/db";

export async function GET(request: Request) {
  if (!(await isBoothAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    const url = await dbSignedCardUrl(path);
    return NextResponse.json({ url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not sign card image";
    const status = /not configured/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
