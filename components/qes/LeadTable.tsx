"use client";

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
};

export function LeadTable({ leads, onSelect }: LeadTableProps) {
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
                Owner
              </th>
              <th className="px-4 py-[11px] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                Added
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
                <td className="whitespace-nowrap px-4 py-[13px] text-slate-600">
                  {lead.owner}
                </td>
                <td className="whitespace-nowrap px-4 py-[13px] text-slate-500">
                  {formatLeadTime(lead.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
