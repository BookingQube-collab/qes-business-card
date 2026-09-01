import { NextResponse } from "next/server";
import OpenAI from "openai";
import { isBoothAuthed } from "@/lib/booth-auth";
import { resolveGeminiApiKey } from "@/lib/gemini-key";
import type { ExtractedBusinessCard } from "@/types/ocr";

export const runtime = "nodejs";

const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-2.5-flash"];

const SYSTEM = `You extract contact fields from a photograph of a business card.
Return ONLY valid JSON with keys: name, company, position, phone, email.
Rules:
- Extract only fields clearly visible on the card. Never invent or guess missing values. Use null when not clearly readable or unsure.
- Do not set interest, priority, owner, or notes.
- Prefer the most prominent person name and company on the card.
- Copy company names in full, including short prefixes or acronyms at the start (e.g. "E3 Events & Entertainment Enterprises", not "Events & Entertainment Enterprises").
- For phone: transcribe the printed mobile/telephone number exactly, including country codes (+974, +971, etc.), spaces, and dashes as shown.
- For email: transcribe the printed email address exactly. It must look like a valid email (user@domain.tld). Do not confuse similar letters (l/I/1, O/0) — re-read blurry characters carefully.
- If multiple phones or emails appear, prefer the one labeled mobile/cell/direct or the most prominent contact line.
- All values must be string or null.`;

export async function POST(request: Request) {
  try {
    if (!(await isBoothAuthed())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof Blob) || image.size === 0) {
      return NextResponse.json(
        { error: "Please attach a business card image." },
        { status: 400 },
      );
    }

    const geminiKey = await resolveGeminiApiKey();
    const openaiKey = process.env.OPENAI_API_KEY?.trim();

    if (!geminiKey && !openaiKey) {
      return NextResponse.json(
        {
          error:
            "Set a Gemini API key in Admin before scanning cards. Do not use demo data.",
        },
        { status: 503 },
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const mime = normalizeMime(image.type);

    const raw = geminiKey
      ? await extractWithGemini(geminiKey, buffer, mime)
      : await extractWithOpenAI(openaiKey!, buffer, mime);

    if (!raw) {
      return NextResponse.json(
        {
          error:
            "We could not read this card clearly. Please try another photo or enter details manually.",
        },
        { status: 422 },
      );
    }

    let parsed: Partial<ExtractedBusinessCard>;
    try {
      parsed = JSON.parse(stripCodeFences(raw)) as Partial<ExtractedBusinessCard>;
    } catch {
      return NextResponse.json(
        {
          error:
            "We could not read this card clearly. Please try another photo or enter details manually.",
        },
        { status: 422 },
      );
    }

    const extracted: ExtractedBusinessCard = {
      name: clean(parsed.name),
      company: clean(parsed.company),
      position: clean(parsed.position),
      phone: clean(parsed.phone),
      email: clean(parsed.email),
    };

    if (
      !extracted.name &&
      !extracted.company &&
      !extracted.email &&
      !extracted.phone
    ) {
      return NextResponse.json(
        {
          error:
            "We could not read this card clearly. Please try another photo or enter details manually.",
          extracted,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ extracted });
  } catch (err) {
    console.error("OCR extract failed", err);
    const message = err instanceof Error ? err.message : "";
    if (/api key|permission_denied|invalid.*key|quota|blocked/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "Gemini key is invalid or blocked. Open Admin and paste a valid key.",
        },
        { status: 502 },
      );
    }
    if (/no longer available|not found|NOT_FOUND/i.test(message)) {
      return NextResponse.json(
        { error: "Gemini model is unavailable. Try again in a moment." },
        { status: 502 },
      );
    }
    return NextResponse.json(
      {
        error:
          "We could not read this card clearly. Please try another photo or enter details manually.",
      },
      { status: 500 },
    );
  }
}

function normalizeMime(type: string | undefined) {
  if (!type || type === "application/octet-stream") return "image/jpeg";
  if (type === "image/jpg") return "image/jpeg";
  return type;
}

async function extractWithGemini(
  apiKey: string,
  buffer: Buffer,
  mime: string,
): Promise<string | null> {
  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mime,
              data: buffer.toString("base64"),
            },
          },
          { text: "Extract the business card fields as JSON." },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  };

  let lastError = "";
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      error?: { message?: string; status?: string };
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    if (!res.ok) {
      lastError = json.error?.message || `Gemini ${model} failed (${res.status})`;
      if (res.status === 404) continue;
      throw new Error(lastError);
    }

    const text =
      json.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() || "";
    if (text) return text;
  }

  if (lastError) throw new Error(lastError);
  return null;
}

async function extractWithOpenAI(
  apiKey: string,
  buffer: Buffer,
  mime: string,
): Promise<string | null> {
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract the business card fields as JSON.",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? null;
}

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return null;
  return trimmed;
}
