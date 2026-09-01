import { NextResponse } from "next/server";
import { isBoothAuthed } from "@/lib/booth-auth";
import { hasSupabaseService } from "@/lib/supabase/server";
import { dbFindDuplicate } from "@/services/leads/db";

export async function GET(request: Request) {
  if (!(await isBoothAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasSupabaseService()) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured on the server. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 },
    );
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
