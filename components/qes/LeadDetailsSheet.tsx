"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { LeadForm, type LeadFormValues } from "@/components/qes/LeadForm";
import { PriorityBadge } from "@/components/qes/PriorityBadge";
import { formatFullDateTime } from "@/lib/lead-utils";
import type { Lead } from "@/types/lead";

type LeadDetailsSheetProps = {
  lead: Lead | null;
  open: boolean;
  editing: boolean;
  editValues: LeadFormValues;
  /** Lazy signed URL for private storage paths. */
  signedImageUrl?: string | null;
  onEditValuesChange: (values: LeadFormValues) => void;
  onClose: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  saving?: boolean;
};

export function leadToFormValues(lead: Lead): LeadFormValues {
  return {
    name: lead.name,
    company: lead.company,
    position: lead.position ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    interest: lead.interest,
    priority: lead.priority,
    owner: lead.owner,
    notes: lead.notes ?? "",
  };
}

export function LeadDetailsSheet({
  lead,
  open,
  editing,
  editValues,
  signedImageUrl,
  onEditValuesChange,
  onClose,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  saving,
}: LeadDetailsSheetProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close details"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl sm:max-w-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between border-b border-[#e6e8ec] px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-[#0f172a]">
            {editing ? "Edit Lead" : "Lead Details"}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] text-[#64748b] active:bg-[#f7f8fa]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {signedImageUrl ||
          (lead.business_card_image &&
            (lead.business_card_image.startsWith("blob:") ||
              lead.business_card_image.startsWith("data:") ||
              lead.business_card_image.startsWith("http"))) ? (
            <div className="mb-4 overflow-hidden rounded-[10px] border border-[#e6e8ec] bg-[#f7f8fa]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  signedImageUrl ||
                  lead.business_card_image ||
                  undefined
                }
                alt="Business card"
                className="mx-auto max-h-48 w-full object-contain p-2"
              />
            </div>
          ) : lead.business_card_image ? (
            <div className="mb-4 flex h-28 items-center justify-center rounded-[10px] border border-dashed border-[#e6e8ec] bg-[#f7f8fa] text-sm text-[#94a3b8]">
              Loading card image…
            </div>
          ) : (
            <div className="mb-4 flex h-28 items-center justify-center rounded-[10px] border border-dashed border-[#e6e8ec] bg-[#f7f8fa] text-sm text-[#94a3b8]">
              No card image
            </div>
          )}

          {editing ? (
            <LeadForm
              values={editValues}
              onChange={onEditValuesChange}
              onSubmit={onSaveEdit}
              submitLabel="Save Changes"
              disabled={saving}
            />
          ) : (
            <dl className="space-y-3 text-sm">
              <Detail label="Name" value={lead.name} />
              <Detail label="Company" value={lead.company} />
              <Detail label="Position" value={lead.position ?? "—"} />
              <Detail label="Mobile" value={lead.phone ?? "—"} />
              <Detail
                label="Email"
                value={
                  lead.email ? (
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-[#2563eb] underline-offset-2 hover:underline"
                    >
                      {lead.email}
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <Detail label="Interest" value={lead.interest} />
              <div>
                <dt className="text-xs font-medium text-[#64748b]">Priority</dt>
                <dd className="mt-1">
                  <PriorityBadge priority={lead.priority} />
                </dd>
              </div>
              <Detail label="Owner" value={lead.owner} />
              <Detail label="Notes" value={lead.notes ?? "—"} />
              <Detail
                label="Created"
                value={formatFullDateTime(lead.created_at)}
              />
            </dl>
          )}
        </div>

        {!editing ? (
          <div className="flex gap-2 border-t border-[#e6e8ec] p-4">
            <button
              type="button"
              onClick={onStartEdit}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[10px] bg-[#2563eb] px-4 text-sm font-semibold text-white active:bg-[#1d4ed8]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[10px] border border-[#e6e8ec] bg-white px-4 text-sm font-medium text-[#0f172a] active:bg-[#f7f8fa]"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="border-t border-[#e6e8ec] p-4">
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-[10px] border border-[#e6e8ec] bg-white px-4 text-sm font-medium text-[#0f172a] active:bg-[#f7f8fa]"
            >
              Cancel Edit
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-[#64748b]">{label}</dt>
      <dd className="mt-0.5 text-[#0f172a]">{value}</dd>
    </div>
  );
}
