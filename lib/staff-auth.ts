import { createHmac, timingSafeEqual } from "crypto";

export const STAFF_COOKIE = "qes_staff";

export function getStaffLogin() {
  return {
    email: (process.env.STAFF_EMAIL?.trim() || "staff@qes.com").toLowerCase(),
    password: process.env.STAFF_PASSWORD?.trim() || "Qes2026!",
  };
}

function sessionSecret() {
  return (
    process.env.STAFF_PASSWORD?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "qes-booth-staff"
  );
}

export function staffSessionToken() {
  return createHmac("sha256", sessionSecret())
    .update("qes-staff-ok")
    .digest("hex");
}

export function isValidStaffSession(token: string | undefined) {
  if (!token) return false;
  const expected = Buffer.from(staffSessionToken());
  const actual = Buffer.from(token);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function credentialsMatch(email: string, password: string) {
  const expected = getStaffLogin();
  if (email.trim().toLowerCase() !== expected.email) return false;
  const actual = Buffer.from(password);
  const wanted = Buffer.from(expected.password);
  if (actual.length !== wanted.length) return false;
  return timingSafeEqual(actual, wanted);
}
