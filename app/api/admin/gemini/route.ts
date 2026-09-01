import { NextResponse } from "next/server";
import { isBoothAuthed } from "@/lib/booth-auth";
import {
  GEMINI_COOKIE,
  encryptApiKey,
  geminiKeySource,
  maskApiKey,
  readAdminGeminiKey,
} from "@/lib/gemini-key";

function cookieOptions(maxAge: number) {
  return {
    name: GEMINI_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function GET() {
  if (!(await isBoothAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminKey = await readAdminGeminiKey();
  const envKey = process.env.GEMINI_API_KEY?.trim() || undefined;
  const source = geminiKeySource(adminKey, envKey);
  const active = adminKey || envKey;

  return NextResponse.json({
    configured: Boolean(active),
    source,
    hint: active ? maskApiKey(active) : null,
  });
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

  const response = NextResponse.json({
    ok: true,
    configured: true,
    source: "admin",
    hint: maskApiKey(apiKey),
  });
  response.cookies.set({
    ...cookieOptions(60 * 60 * 24 * 60),
    value: encryptApiKey(apiKey),
  });
  return response;
}

export async function DELETE() {
  if (!(await isBoothAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const envKey = process.env.GEMINI_API_KEY?.trim() || undefined;
  const response = NextResponse.json({
    ok: true,
    configured: Boolean(envKey),
    source: envKey ? "env" : null,
    hint: envKey ? maskApiKey(envKey) : null,
  });
  response.cookies.set({
    ...cookieOptions(0),
    value: "",
  });
  return response;
}
