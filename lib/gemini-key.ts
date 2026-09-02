import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { cookies } from "next/headers";
import { appSecret } from "@/lib/staff-auth";
import {
  createServiceClient,
  hasSupabaseService,
} from "@/lib/supabase/server";

export const GEMINI_COOKIE = "qes_gemini";
export const GEMINI_SETTINGS_KEY = "gemini_api_key";

export type GeminiKeySource = "admin" | "env" | "session" | null;

export function maskApiKey(key: string) {
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "••••";
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

function aesKey() {
  return createHash("sha256").update(appSecret()).digest();
}

export function encryptApiKey(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptApiKey(token: string) {
  const buf = Buffer.from(token, "base64url");
  if (buf.length < 29) throw new Error("Invalid key cookie");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", aesKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    "utf8",
  );
}

/** Shared Admin override stored in Supabase (all devices). */
export async function readSharedGeminiKey(): Promise<string | undefined> {
  if (!hasSupabaseService()) return undefined;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", GEMINI_SETTINGS_KEY)
      .maybeSingle();
    if (error || !data?.value) return undefined;
    const key = decryptApiKey(data.value).trim();
    return key || undefined;
  } catch {
    return undefined;
  }
}

export async function writeSharedGeminiKey(apiKey: string): Promise<void> {
  if (!hasSupabaseService()) {
    throw new Error(
      "Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY, or set GEMINI_API_KEY on the server instead.",
    );
  }
  const supabase = createServiceClient();
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: GEMINI_SETTINGS_KEY,
      value: encryptApiKey(apiKey.trim()),
    },
    { onConflict: "key" },
  );
  if (error) {
    const missingTable =
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /app_settings/i.test(error.message);
    throw new Error(
      missingTable
        ? "Missing app_settings table. Run supabase/migrations/003_app_settings.sql in the Supabase SQL editor."
        : `Could not save Gemini key: ${error.message}`,
    );
  }
}

export async function clearSharedGeminiKey(): Promise<void> {
  if (!hasSupabaseService()) return;
  try {
    const supabase = createServiceClient();
    await supabase.from("app_settings").delete().eq("key", GEMINI_SETTINGS_KEY);
  } catch {
    // Best-effort clear when service is misconfigured.
  }
}

/** Legacy per-browser cookie (kept as last-resort fallback). */
export async function readSessionGeminiKey(): Promise<string | undefined> {
  const store = await cookies();
  const token = store.get(GEMINI_COOKIE)?.value;
  if (!token) return undefined;
  try {
    const key = decryptApiKey(token).trim();
    return key || undefined;
  } catch {
    return undefined;
  }
}

/** @deprecated Prefer readSharedGeminiKey / readSessionGeminiKey */
export async function readAdminGeminiKey(): Promise<string | undefined> {
  return (
    (await readSharedGeminiKey()) || (await readSessionGeminiKey()) || undefined
  );
}

/**
 * Resolve Gemini key for OCR.
 * Order: shared Admin DB override → env GEMINI_API_KEY → legacy session cookie.
 */
export async function resolveGeminiApiKey(): Promise<string | undefined> {
  return (
    (await readSharedGeminiKey()) ||
    process.env.GEMINI_API_KEY?.trim() ||
    (await readSessionGeminiKey()) ||
    undefined
  );
}

export function geminiKeySource(
  sharedKey: string | undefined,
  envKey = process.env.GEMINI_API_KEY?.trim(),
  sessionKey?: string,
): GeminiKeySource {
  if (sharedKey) return "admin";
  if (envKey) return "env";
  if (sessionKey) return "session";
  return null;
}

export async function getGeminiKeyStatus() {
  const sharedKey = await readSharedGeminiKey();
  const envKey = process.env.GEMINI_API_KEY?.trim() || undefined;
  const sessionKey = sharedKey || envKey ? undefined : await readSessionGeminiKey();
  const source = geminiKeySource(sharedKey, envKey, sessionKey);
  const active = sharedKey || envKey || sessionKey;
  return {
    configured: Boolean(active),
    source,
    hint: active ? maskApiKey(active) : null,
  };
}
