import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { STAFF_COOKIE, isValidStaffSession } from "@/lib/staff-auth";

export async function GET() {
  const store = await cookies();
  const authed = isValidStaffSession(store.get(STAFF_COOKIE)?.value);
  return NextResponse.json({ authed });
}
