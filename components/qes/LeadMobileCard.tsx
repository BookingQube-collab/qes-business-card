"use client";

import {
  InterestBadge,
  PriorityBadge,
} from "@/components/qes/PriorityBadge";
import { formatLeadTime } from "@/lib/lead-utils";
import type { Lead } from "@/types/lead";

type LeadMobileCardProps = {
  lead: Lead;
  onSelect: (lead: Lead) => void;
};

export function LeadMobileCard({ lead, onSelect }: LeadMobileCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(lead)}
      className="w-full rounded-2xl border border-[#e8eaef] bg-white p-4 text-left shadow-sm active:bg-[#f8fafc]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[#0f172a]">
            {lead.name}
          </p>
          <p className="truncate text-sm text-slate-500">{lead.company}</p>
        </div>
        <PriorityBadge priority={lead.priority} />
      </div>

      <div className="mt-3 space-y-0.5 text-sm text-slate-600">
        {lead.phone ? <p>{lead.phone}</p> : null}
        {lead.email ? (
          <p className="truncate text-[#2563eb]">{lead.email}</p>
        ) : null}
      </div>

      <div className="mt-3">
        <InterestBadge interest={lead.interest} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-sm text-slate-500">
        <span>{lead.owner}</span>
        <span>{formatLeadTime(lead.created_at)}</span>
      </div>

      <div className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[#2563eb]">
        View Card
      </div>
    </button>
  );
}

export function LeadMobileList({
  leads,
  onSelect,
}: {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
}) {
  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-[#e6e8ec] bg-white px-4 py-10 text-center text-sm text-slate-500 min-[900px]:hidden">
        No leads in the database yet. Scan a card to save one.
      </div>
    );
  }

  return (
    <div className="space-y-3 min-[900px]:hidden">
      {leads.map((lead) => (
        <LeadMobileCard key={lead.id} lead={lead} onSelect={onSelect} />
      ))}
    </div>
  );
}
