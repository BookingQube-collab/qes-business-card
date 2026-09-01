"use client";

import type { Lead } from "@/types/lead";

type DuplicateDialogProps = {
  lead: Lead;
  onViewExisting: () => void;
  onSaveAnyway: () => void;
  onCancel: () => void;
  saving?: boolean;
};

export function DuplicateDialog({
  lead,
  onViewExisting,
  onSaveAnyway,
  onCancel,
  saving,
}: DuplicateDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Dismiss"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dup-title"
        className="relative w-full max-w-md rounded-2xl border border-[#e6e8ec] bg-white p-5 shadow-xl"
      >
        <h2 id="dup-title" className="text-lg font-semibold text-slate-900">
          Possible duplicate
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          A lead with the same email or phone already exists:
        </p>
        <div className="mt-3 rounded-xl border border-[#e6e8ec] bg-[#f6f7fa] px-3 py-2.5 text-sm">
          <p className="font-semibold text-slate-900">{lead.name}</p>
          <p className="text-slate-600">{lead.company}</p>
          {lead.email ? <p className="text-slate-500">{lead.email}</p> : null}
          {lead.phone ? <p className="text-slate-500">{lead.phone}</p> : null}
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            disabled={saving}
            onClick={onViewExisting}
            className="qes-gradient-btn inline-flex min-h-11 flex-1 items-center justify-center rounded-[10px] px-3 text-sm font-bold disabled:opacity-50"
          >
            View Existing
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSaveAnyway}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[10px] border border-[#e6e8ec] bg-white px-3 text-sm font-semibold text-slate-800 disabled:opacity-50"
          >
            Save Anyway
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[10px] px-3 text-sm font-medium text-slate-500 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
