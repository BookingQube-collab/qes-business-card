import { NextResponse } from "next/server";
import { GEMINI_COOKIE } from "@/lib/gemini-key";
import { STAFF_COOKIE } from "@/lib/staff-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const clear = {
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
  response.cookies.set({ name: STAFF_COOKIE, ...clear });
  response.cookies.set({ name: GEMINI_COOKIE, ...clear });
  return response;
}
