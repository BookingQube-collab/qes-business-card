"use client";

import { Plus } from "lucide-react";
import { LeadFiltersBar } from "@/components/qes/LeadFilters";
import { LeadMobileList } from "@/components/qes/LeadMobileCard";
import { LeadTable } from "@/components/qes/LeadTable";
import { ReportStats } from "@/components/qes/Stats";
import { BOOTH, EVENT_NAME } from "@/lib/constants";
import type { Lead, LeadFilters, LeadStats } from "@/types/lead";

type LeadReportProps = {
  stats: LeadStats;
  leads: Lead[];
  totalCount: number;
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
  onClearFilters: () => void;
  onSelectLead: (lead: Lead) => void;
  onAddCard: () => void;
};

export function LeadReport({
  stats,
  leads,
  totalCount,
  filters,
  onFiltersChange,
  onClearFilters,
  onSelectLead,
  onAddCard,
}: LeadReportProps) {
  return (
    <div className="min-h-[calc(100dvh-73px)] bg-[#f6f7fa] pb-16">
      <div className="mx-auto max-w-[1320px] px-4 pt-[22px] sm:px-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">
              Collected Leads
            </h2>
            <p className="text-[13px] text-slate-500">
              {EVENT_NAME} • {BOOTH}
            </p>
          </div>
          <button
            type="button"
            onClick={onAddCard}
            className="qes-gradient-btn inline-flex min-h-11 items-center gap-2 rounded-[10px] px-[18px] py-3 text-[13.5px] font-bold"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add Business Card
          </button>
        </div>

        <ReportStats stats={stats} />

        <div className="mt-3.5">
          <LeadFiltersBar
            filters={filters}
            onChange={onFiltersChange}
            onClear={onClearFilters}
          />
        </div>

        <p className="mt-2.5 text-[12.5px] text-slate-500">
          Showing {leads.length} of {totalCount} cards on this device
        </p>

        <div className="mt-2.5">
          <LeadTable leads={leads} onSelect={onSelectLead} />
          <LeadMobileList leads={leads} onSelect={onSelectLead} />
        </div>
      </div>
    </div>
  );
}
