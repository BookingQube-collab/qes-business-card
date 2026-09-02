"use client";

import { INTERESTS, PRIORITIES } from "@/lib/constants";
import { priorityClass } from "@/lib/lead-utils";
import type { Interest, Priority } from "@/types/lead";

export type LeadFormValues = {
  name: string;
  company: string;
  position: string;
  phone: string;
  email: string;
  interest: Interest | "";
  interestOther: string;
  priority: Priority | "";
  notes: string;
};

type LeadFormProps = {
  values: LeadFormValues;
  onChange: (next: LeadFormValues) => void;
  onSubmit: () => void;
  submitLabel?: string;
  disabled?: boolean;
  /** Shows spinner + "Saving…" and blocks double-submit. */
  busy?: boolean;
  variant?: "light" | "dark";
};

export const EMPTY_LEAD_FORM: LeadFormValues = {
  name: "",
  company: "",
  position: "",
  phone: "",
  email: "",
  interest: "",
  interestOther: "",
  priority: "",
  notes: "",
};

export function LeadForm({
  values,
  onChange,
  onSubmit,
  submitLabel = "Save Lead",
  disabled,
  busy,
  variant = "light",
}: LeadFormProps) {
  const dark = variant === "dark";
  const inputClass = dark ? "field-input-dark" : "field-input";
  const labelClass = dark
    ? "block text-sm font-medium text-slate-200"
    : "block text-sm font-medium text-[#0f172a]";
  const legendClass = dark
    ? "text-sm font-medium text-slate-200"
    : "text-sm font-medium text-[#0f172a]";
  const locked = Boolean(disabled || busy);

  function setField<K extends keyof LeadFormValues>(
    key: K,
    value: LeadFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  const otherSelected = values.interest === "Other";
  const canSave =
    values.name.trim() &&
    values.company.trim() &&
    values.interest &&
    values.priority &&
    (!otherSelected || values.interestOther.trim());

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave || locked) return;
        onSubmit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full Name" htmlFor="lead-name" labelClass={labelClass}>
          <input
            id="lead-name"
            className={inputClass}
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            autoComplete="name"
            required
            disabled={locked}
          />
        </Field>
        <Field label="Company" htmlFor="lead-company" labelClass={labelClass}>
          <input
            id="lead-company"
            className={inputClass}
            value={values.company}
            onChange={(e) => setField("company", e.target.value)}
            autoComplete="organization"
            required
            disabled={locked}
          />
        </Field>
        <Field label="Position" htmlFor="lead-position" labelClass={labelClass}>
          <input
            id="lead-position"
            className={inputClass}
            value={values.position}
            onChange={(e) => setField("position", e.target.value)}
            autoComplete="organization-title"
            disabled={locked}
          />
        </Field>
        <Field label="Mobile" htmlFor="lead-phone" labelClass={labelClass}>
          <input
            id="lead-phone"
            className={inputClass}
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={(e) => setField("phone", e.target.value)}
            autoComplete="tel"
            disabled={locked}
          />
        </Field>
        <Field
          label="Email"
          htmlFor="lead-email"
          labelClass={labelClass}
          className="sm:col-span-2"
        >
          <input
            id="lead-email"
            className={inputClass}
            type="email"
            inputMode="email"
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            autoComplete="email"
            disabled={locked}
          />
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className={legendClass}>Interest</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => {
            const selected = values.interest === interest;
            return (
              <button
                key={interest}
                type="button"
                disabled={locked}
                onClick={() =>
                  onChange({
                    ...values,
                    interest,
                    interestOther:
                      interest === "Other" ? values.interestOther : "",
                  })
                }
                className={`inline-flex min-h-11 items-center rounded-xl border px-3 text-sm font-medium transition-colors ${
                  selected
                    ? dark
                      ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-300"
                      : "border-[#2563eb] bg-[#eff6ff] text-[#1d4ed8]"
                    : dark
                      ? "border-white/10 bg-white/5 text-slate-200 active:bg-white/10"
                      : "border-[#e6e8ec] bg-white text-[#0f172a] active:bg-[#f7f8fa]"
                }`}
              >
                {interest}
              </button>
            );
          })}
        </div>
        {otherSelected ? (
          <Field
            label="Describe interest"
            htmlFor="lead-interest-other"
            labelClass={labelClass}
          >
            <input
              id="lead-interest-other"
              className={inputClass}
              value={values.interestOther}
              onChange={(e) => setField("interestOther", e.target.value)}
              placeholder="What are they interested in?"
              required
              disabled={locked}
            />
          </Field>
        ) : null}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className={legendClass}>Priority</legend>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITIES.map((priority) => {
            const selected = values.priority === priority;
            return (
              <button
                key={priority}
                type="button"
                disabled={locked}
                onClick={() => setField("priority", priority)}
                className={`inline-flex min-h-11 items-center justify-center rounded-xl border text-sm font-semibold transition-colors ${
                  selected
                    ? priorityClass(priority)
                    : dark
                      ? "border-white/10 bg-white/5 text-slate-400 active:bg-white/10"
                      : "border-[#e6e8ec] bg-white text-[#64748b] active:bg-[#f7f8fa]"
                }`}
              >
                {priority}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field
        label="Notes"
        htmlFor="lead-notes"
        labelClass={labelClass}
        optional
        optionalClass={dark ? "text-slate-500" : "text-[#64748b]"}
      >
        <textarea
          id="lead-notes"
          className={`${inputClass} min-h-[72px] resize-y`}
          rows={2}
          placeholder="Important discussion or follow-up notes..."
          value={values.notes}
          onChange={(e) => setField("notes", e.target.value)}
          disabled={locked}
        />
      </Field>

      <button
        type="submit"
        disabled={!canSave || locked}
        aria-busy={busy || undefined}
        className="qes-gradient-btn inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? (
          <>
            <span
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/85 border-t-transparent"
              aria-hidden
            />
            Saving…
          </>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
  optional,
  className = "",
  labelClass,
  optionalClass = "text-[#64748b]",
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  optional?: boolean;
  className?: string;
  labelClass: string;
  optionalClass?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {optional ? (
          <span className={`ml-1 font-normal ${optionalClass}`}>(optional)</span>
        ) : null}
      </label>
      {children}
    </div>
  );
}
