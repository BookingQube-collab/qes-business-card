import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseUrl, requireSupabaseEnv } from "@/lib/supabase/env";

export async function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — ignore if middleware refreshes sessions.
        }
      },
    },
  });
}

/** Service-role client for privileged server routes only. Never expose to browser. */
export function hasSupabaseService() {
  const url = getSupabaseUrl();
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();
  return Boolean(url && serviceKey);
}

export function createServiceClient() {
  const url = getSupabaseUrl();
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase is not configured on the server. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createSupabaseClient(url.replace(/\/$/, ""), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
