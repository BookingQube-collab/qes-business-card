import { cookies } from "next/headers";
import { STAFF_COOKIE, isValidStaffSession } from "@/lib/staff-auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function isBoothAuthed(): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) return true;
    } catch {
      // fall through to staff cookie
    }
  }
  const store = await cookies();
  return isValidStaffSession(store.get(STAFF_COOKIE)?.value);
}
