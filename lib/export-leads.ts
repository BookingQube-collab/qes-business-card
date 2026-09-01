import * as XLSX from "xlsx";
import {
  parseInterestOther,
  stripInterestOtherFromNotes,
} from "@/lib/lead-form-utils";
import { formatFullDateTime } from "@/lib/lead-utils";
import type { Lead } from "@/types/lead";

function leadToRow(lead: Lead) {
  const interestDetail =
    lead.interest === "Other"
      ? parseInterestOther(lead.interest, lead.notes) || lead.interest
      : lead.interest;

  return {
    Name: lead.name,
    Company: lead.company,
    Position: lead.position ?? "",
    Mobile: lead.phone ?? "",
    Email: lead.email ?? "",
    Interest: interestDetail,
    Priority: lead.priority,
    Added: formatFullDateTime(lead.created_at),
    Notes: stripInterestOtherFromNotes(lead.interest, lead.notes),
  };
}

export function downloadLeadsExcel(
  leads: Lead[],
  filenamePrefix = "qes-leads",
): void {
  const rows = leads.map(leadToRow);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filenamePrefix}-${date}.xlsx`);
}
