"use client";

import { Pencil, Trash2 } from "lucide-react";
import {
  InterestBadge,
  PriorityBadge,
} from "@/components/qes/PriorityBadge";
import { CardThumb } from "@/components/qes/CardThumb";
import { formatLeadTime } from "@/lib/lead-utils";
import type { Lead } from "@/types/lead";

type LeadTableProps = {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  deletingId?: string | null;
};

export function LeadTable({
  leads,
  onSelect,
  onEdit,
  onDelete,
  deletingId,
}: LeadTableProps) {
  if (leads.length === 0) {
    return (
      <div className="hidden rounded-xl border border-[#e6e8ec] bg-white px-4 py-10 text-center text-sm text-slate-500 min-[900px]:block">
        No leads in the database yet. Scan a card to save one.
      </div>
    );
  }

  return (
    <div className="hidden overflow-hidden rounded-xl border border-[#e6e8ec] bg-white min-[900px]:block">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13.5px]">
          <thead>
            <tr className="bg-[#fafbfc]">
              <th className="px-4 py-[11px] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                Card
              </th>
              <th className="px-4 py-[11px] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                Name
              </th>
              <th className="px-4 py-[11px] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                Company
              </th>
              <th className="px-4 py-[11px] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                Mobile
              </th>
              <th className="px-4 py-[11px] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                Email
              </th>
              <th className="px-4 py-[11px] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                Interest
              </th>
              <th className="px-4 py-[11px] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                Priority
              </th>
              <th className="px-4 py-[11px] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                Added
              </th>
              <th className="px-4 py-[11px] text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onSelect(lead)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(lead);
                  }
                }}
                tabIndex={0}
                role="button"
                className="cursor-pointer border-b border-[#f1f3f6] last:border-b-0 hover:bg-[#fafbfc] focus-visible:bg-[#eff6ff] focus-visible:outline-none"
              >
                <td className="px-4 py-2.5">
                  <CardThumb lead={lead} />
                </td>
                <td className="whitespace-nowrap px-4 py-[13px] font-medium text-slate-900">
                  {lead.name}
                </td>
                <td className="px-4 py-[13px] text-slate-600">{lead.company}</td>
                <td className="whitespace-nowrap px-4 py-[13px] text-slate-600">
                  {lead.phone ?? "—"}
                </td>
                <td className="max-w-[180px] truncate px-4 py-[13px] text-slate-600">
                  {lead.email ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-[13px]">
                  <InterestBadge interest={lead.interest} />
                </td>
                <td className="whitespace-nowrap px-4 py-[13px]">
                  <PriorityBadge priority={lead.priority} />
                </td>
                <td className="whitespace-nowrap px-4 py-[13px] text-slate-500">
                  {formatLeadTime(lead.created_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-[13px]">
                  <div
                    className="flex items-center justify-end gap-1"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onEdit(lead)}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-[10px] border border-[#e6e8ec] bg-white px-2.5 text-[12.5px] font-semibold text-slate-700 hover:bg-[#f7f8fa]"
                      aria-label={`Edit ${lead.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(lead)}
                      disabled={deletingId === lead.id}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-[10px] border border-[#f1d5d5] bg-white px-2.5 text-[12.5px] font-semibold text-[#b42318] hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Delete ${lead.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      {deletingId === lead.id ? "…" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
