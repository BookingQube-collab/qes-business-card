import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { cookies } from "next/headers";
import { appSecret } from "@/lib/staff-auth";

export const GEMINI_COOKIE = "qes_gemini";

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

export async function readAdminGeminiKey(): Promise<string | undefined> {
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

export async function resolveGeminiApiKey(): Promise<string | undefined> {
  return (
    (await readAdminGeminiKey()) || process.env.GEMINI_API_KEY?.trim() || undefined
  );
}

export function geminiKeySource(
  adminKey: string | undefined,
  envKey = process.env.GEMINI_API_KEY?.trim(),
): "admin" | "env" | null {
  if (adminKey) return "admin";
  if (envKey) return "env";
  return null;
}
