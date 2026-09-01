/** Post-process OCR email strings — fix common misreads and reject invalid values. */

const EMAIL_RE =
  /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function normalizeOcrEmail(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;

  let email = raw.trim();
  if (!email || email.toLowerCase() === "null") return null;

  email = email.replace(/^mailto:/i, "");
  email = email.replace(/^\s*e-?mail\s*[:.]?\s*/i, "");
  email = email.replace(/\s+/g, "");
  email = email.replace(/\(at\)|\[at\]|\{at\}|@+/gi, "@");
  email = email.replace(/\(dot\)|\[dot\]|\{dot\}/gi, ".");
  email = email.replace(/[,;]+$/, "");

  const at = email.indexOf("@");
  if (at > 0) {
    const local = email.slice(0, at);
    const domain = email.slice(at + 1).toLowerCase().replace(/\.{2,}/g, ".");
    email = `${local}@${domain}`;
  } else {
    email = email.toLowerCase();
  }

  email = fixCommonOcrTypos(email);

  if (!isValidEmail(email)) return null;
  return email.toLowerCase();
}

function fixCommonOcrTypos(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;

  const local = email.slice(0, at);
  let domain = email.slice(at + 1);

  domain = domain
    .replace(/^www\./, "")
    .replace(/\.c0m$/i, ".com")
    .replace(/\.corn$/i, ".com")
    .replace(/\.coom$/i, ".com")
    .replace(/\.con$/i, ".com")
    .replace(/\.nett$/i, ".net")
    .replace(/\.orgg$/i, ".org")
    .replace(/\.qa+$/, ".qa")
    .replace(/gmai1\./i, "gmail.")
    .replace(/gmial\./i, "gmail.")
    .replace(/gmal\./i, "gmail.")
    .replace(/hotmai1\./i, "hotmail.")
    .replace(/yaho0\./i, "yahoo.")
    .replace(/outlook\.c0m$/i, "outlook.com");

  return `${local}@${domain}`;
}
