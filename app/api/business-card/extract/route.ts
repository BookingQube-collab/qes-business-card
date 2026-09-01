import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { mockExtractedContact } from "@/lib/lead-utils";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ExtractedBusinessCard } from "@/types/ocr";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-2.0-flash";

const SYSTEM = `You extract contact fields from a photograph of a business card.
Return ONLY valid JSON with keys: name, company, position, phone, email.
Rules:
- Extract only fields clearly visible on the card. Never invent or guess missing values. Use null when not clearly readable or unsure.
- Do not set interest, priority, owner, or notes.
- Prefer the most prominent person name and company on the card.
- Keep phone numbers and emails exactly as printed when readable.
- All values must be string or null.`;

export async function POST(request: Request) {
  try {
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const form = await request.formData();
    const image = form.get("image");
    // Node/undici may yield Blob rather than File for multipart parts
    if (!(image instanceof Blob) || image.size === 0) {
      return NextResponse.json(
        { error: "Please attach a business card image." },
        { status: 400 },
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const openaiKey = process.env.OPENAI_API_KEY?.trim();

    // Demo booth: mock extract only when no AI provider key is configured
    if (!geminiKey && !openaiKey) {
      return NextResponse.json({
        extracted: mockExtractedContact(),
        demo: true,
      });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const mime =
      (image.type && image.type !== "application/octet-stream"
        ? image.type
        : null) || "image/jpeg";

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

    const parsed = JSON.parse(stripCodeFences(raw)) as Partial<ExtractedBusinessCard>;
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
    return NextResponse.json(
      {
        error:
          "We could not read this card clearly. Please try another photo or enter details manually.",
      },
      { status: 500 },
    );
  }
}

async function extractWithGemini(
  apiKey: string,
  buffer: Buffer,
  mime: string,
): Promise<string | null> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SYSTEM,
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: mime,
        data: buffer.toString("base64"),
      },
    },
    { text: "Extract the business card fields as JSON." },
  ]);

  return result.response.text() || null;
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
