import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ExtractedBusinessCard } from "@/types/ocr";

export const runtime = "nodejs";

const SYSTEM = `You extract contact fields from a photograph of a business card.
Return ONLY valid JSON with keys: name, company, position, phone, email.
Rules:
- Never invent or guess missing values. Use null when not clearly readable.
- Do not set interest, priority, owner, or notes.
- Prefer the most prominent person name and company on the card.
- Keep phone numbers and emails exactly as printed when readable.`;

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Card reading is not configured. Ask an admin to set OPENAI_API_KEY.",
        },
        { status: 503 },
      );
    }

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
    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json(
        { error: "Please attach a business card image." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const mime = image.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        {
          error:
            "We could not read this card clearly. Please try another photo or enter details manually.",
        },
        { status: 422 },
      );
    }

    const parsed = JSON.parse(raw) as Partial<ExtractedBusinessCard>;
    const extracted: ExtractedBusinessCard = {
      name: clean(parsed.name),
      company: clean(parsed.company),
      position: clean(parsed.position),
      phone: clean(parsed.phone),
      email: clean(parsed.email),
    };

    if (!extracted.name && !extracted.company && !extracted.email && !extracted.phone) {
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

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return null;
  return trimmed;
}
