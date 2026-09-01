import { cookies } from "next/headers";
import { connection } from "next/server";
import { QesApp } from "@/components/qes/QesApp";
import { STAFF_COOKIE, isValidStaffSession } from "@/lib/staff-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  await connection();
  const supabaseUrl =
    process.env["NEXT_PUBLIC_SUPABASE_URL"]?.trim() ||
    process.env["SUPABASE_URL"]?.trim() ||
    "";
  const supabaseAnonKey =
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]?.trim() ||
    process.env["SUPABASE_ANON_KEY"]?.trim() ||
    "";

  let initialAuthed = false;
  try {
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      initialAuthed = Boolean(user);
    }
  } catch {
    initialAuthed = false;
  }
  if (!initialAuthed) {
    const store = await cookies();
    initialAuthed = isValidStaffSession(store.get(STAFF_COOKIE)?.value);
  }

  return (
    <QesApp
      supabaseUrl={supabaseUrl}
      supabaseAnonKey={supabaseAnonKey}
      initialAuthed={initialAuthed}
    />
  );
}

