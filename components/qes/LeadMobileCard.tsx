"use client";

import { Pencil, Trash2 } from "lucide-react";
import {
  InterestBadge,
  PriorityBadge,
} from "@/components/qes/PriorityBadge";
import { formatLeadTime } from "@/lib/lead-utils";
import type { Lead } from "@/types/lead";

type LeadMobileCardProps = {
  lead: Lead;
  onSelect: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  deleting?: boolean;
};

export function LeadMobileCard({
  lead,
  onSelect,
  onEdit,
  onDelete,
  deleting,
}: LeadMobileCardProps) {
  return (
    <div className="w-full rounded-2xl border border-[#e8eaef] bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => onSelect(lead)}
        className="w-full text-left active:opacity-90"
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
          <span className="font-medium text-[#2563eb]">View Card</span>
          <span>{formatLeadTime(lead.created_at)}</span>
        </div>
      </button>

      <div className="mt-3 flex gap-2 border-t border-[#f1f3f6] pt-3">
        <button
          type="button"
          onClick={() => onEdit(lead)}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#e6e8ec] bg-white px-3 text-sm font-semibold text-slate-700 active:bg-[#f7f8fa]"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(lead)}
          disabled={deleting}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#f1d5d5] bg-white px-3 text-sm font-semibold text-[#b42318] active:bg-[#fef2f2] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

export function LeadMobileList({
  leads,
  onSelect,
  onEdit,
  onDelete,
  deletingId,
}: {
  leads: Lead[];
  onSelect: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  deletingId?: string | null;
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
        <LeadMobileCard
          key={lead.id}
          lead={lead}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          deleting={deletingId === lead.id}
        />
      ))}
    </div>
  );
}
