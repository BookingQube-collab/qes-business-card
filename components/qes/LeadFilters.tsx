"use client";

import { Search, X } from "lucide-react";
import { INTERESTS, PRIORITIES } from "@/lib/constants";
import type { Interest, LeadFilters, Priority } from "@/types/lead";

type LeadFiltersProps = {
  filters: LeadFilters;
  onChange: (filters: LeadFilters) => void;
  onClear: () => void;
};

export function LeadFiltersBar({
  filters,
  onChange,
  onClear,
}: LeadFiltersProps) {
  const hasActive =
    filters.search.trim() !== "" ||
    filters.priority !== "All" ||
    filters.interest !== "All" ||
    filters.date !== "All";

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#e6e8ec] bg-white p-3">
      <div className="relative min-w-[200px] flex-1 basis-60">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search name, company, phone or email..."
          className="field-input rounded-[10px] border-[#e6e8ec] bg-white pl-9"
          aria-label="Search leads"
        />
      </div>

      <FilterSelect
        label="Priority"
        value={filters.priority}
        onChange={(v) =>
          onChange({ ...filters, priority: v as Priority | "All" })
        }
        options={["All", ...PRIORITIES]}
      />
      <FilterSelect
        label="Interest"
        value={filters.interest}
        onChange={(v) =>
          onChange({ ...filters, interest: v as Interest | "All" })
        }
        options={["All", ...INTERESTS]}
      />
      <FilterSelect
        label="Date"
        value={filters.date}
        onChange={(v) =>
          onChange({
            ...filters,
            date: v as LeadFilters["date"],
          })
        }
        options={["All", "Today", "Yesterday", "This Week"]}
      />
      <button
        type="button"
        onClick={onClear}
        disabled={!hasActive}
        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-[#e6e8ec] bg-white px-3 text-[13px] font-medium text-slate-600 disabled:opacity-40"
      >
        <X className="h-4 w-4" aria-hidden />
        Clear Filters
      </button>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="relative block min-w-[118px]">
      <span className="sr-only">{label}</span>
      <select
        className="field-input rounded-[10px] border-[#e6e8ec] bg-white py-2.5 text-[13px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "All" ? label : opt}
          </option>
        ))}
      </select>
    </label>
  );
}
