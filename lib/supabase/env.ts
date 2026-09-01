function trimEnv(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function decodeJwtPayload(jwt: string): { role?: string } | null {
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as { role?: string };
  } catch {
    return null;
  }
}

/** Dynamic key so Next.js does not inline NEXT_PUBLIC_ values at build time. */
function readEnv(name: string): string | undefined {
  return trimEnv(process.env[name]);
}

let runtimeUrl: string | undefined;
let runtimeAnonKey: string | undefined;

export function setRuntimeSupabaseConfig(
  url?: string | null,
  anonKey?: string | null,
) {
  runtimeUrl = trimEnv(url);
  runtimeAnonKey = trimEnv(anonKey);
}

export function getSupabaseUrl(): string | undefined {
  return (
    runtimeUrl ||
    readEnv("NEXT_PUBLIC_SUPABASE_URL") ||
    readEnv("SUPABASE_URL")
  );
}

export function getSupabaseAnonKey(): string | undefined {
  return (
    runtimeAnonKey ||
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    readEnv("SUPABASE_ANON_KEY")
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function requireSupabaseEnv() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be an https://….supabase.co project URL",
    );
  }

  if (anonKey.startsWith("sb_publishable")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY must be the legacy JWT anon key (eyJ…), not sb_publishable_… — copy anon public from Project Settings → API, then restart the dev server",
    );
  }

  if (!anonKey.startsWith("eyJ")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY must be a JWT starting with eyJ… (anon public)",
    );
  }

  const role = decodeJwtPayload(anonKey)?.role;
  if (role === "service_role") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is the service_role key — use the anon public JWT in the browser client instead",
    );
  }
  if (role && role !== "anon") {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_ANON_KEY has role "${role}" — expected anon`,
    );
  }

  return { url: url.replace(/\/$/, ""), anonKey };
}
