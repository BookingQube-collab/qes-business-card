const OTHER_INTEREST_PREFIX = "Other interest: ";

export function buildLeadNotes(values: {
  interest: string;
  interestOther: string;
  notes: string;
}): string | null {
  const parts: string[] = [];

  if (values.interest === "Other" && values.interestOther.trim()) {
    parts.push(`${OTHER_INTEREST_PREFIX}${values.interestOther.trim()}`);
  }

  const userNotes = values.notes.trim();
  if (userNotes) parts.push(userNotes);

  return parts.length > 0 ? parts.join("\n\n") : null;
}

export function parseInterestOther(
  interest: string,
  notes: string | null | undefined,
): string {
  if (interest !== "Other" || !notes) return "";
  const prefix = "Other interest: ";
  if (!notes.startsWith(prefix)) return "";
  const rest = notes.slice(prefix.length);
  const split = rest.indexOf("\n\n");
  return (split >= 0 ? rest.slice(0, split) : rest).trim();
}

export function stripInterestOtherFromNotes(
  interest: string,
  notes: string | null | undefined,
): string {
  if (interest !== "Other" || !notes) return notes?.trim() ?? "";
  const prefix = "Other interest: ";
  if (!notes.startsWith(prefix)) return notes.trim();
  const rest = notes.slice(prefix.length);
  const split = rest.indexOf("\n\n");
  return (split >= 0 ? rest.slice(split + 2) : "").trim();
}
