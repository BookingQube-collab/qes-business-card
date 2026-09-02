import { NextResponse } from "next/server";
import { isBoothAuthed } from "@/lib/booth-auth";
import {
  GEMINI_COOKIE,
  clearSharedGeminiKey,
  getGeminiKeyStatus,
  maskApiKey,
  writeSharedGeminiKey,
} from "@/lib/gemini-key";

function clearLegacyCookie() {
  return {
    name: GEMINI_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export async function GET() {
  if (!(await isBoothAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getGeminiKeyStatus());
}

export async function PUT(request: Request) {
  if (!(await isBoothAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let apiKey = "";
  try {
    const body = (await request.json()) as { apiKey?: unknown };
    apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (apiKey.length < 20) {
    return NextResponse.json(
      { error: "Paste a full Gemini API key (at least 20 characters)." },
      { status: 400 },
    );
  }

  try {
    await writeSharedGeminiKey(apiKey);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save Gemini key";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const response = NextResponse.json({
    ok: true,
    configured: true,
    source: "admin",
    hint: maskApiKey(apiKey),
  });
  // Drop any legacy per-browser cookie so resolution stays shared.
  response.cookies.set(clearLegacyCookie());
  return response;
}

export async function DELETE() {
  if (!(await isBoothAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await clearSharedGeminiKey();

  const envKey = process.env.GEMINI_API_KEY?.trim() || undefined;
  const response = NextResponse.json({
    ok: true,
    configured: Boolean(envKey),
    source: envKey ? "env" : null,
    hint: envKey ? maskApiKey(envKey) : null,
  });
  response.cookies.set(clearLegacyCookie());
  return response;
}
