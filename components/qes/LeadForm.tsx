"use client";

import { INTERESTS, OWNERS, PRIORITIES } from "@/lib/constants";
import { priorityClass } from "@/lib/lead-utils";
import type { Interest, Owner, Priority } from "@/types/lead";

export type LeadFormValues = {
  name: string;
  company: string;
  position: string;
  phone: string;
  email: string;
  interest: Interest | "";
  priority: Priority | "";
  owner: Owner | "";
  notes: string;
};

type LeadFormProps = {
  values: LeadFormValues;
  onChange: (next: LeadFormValues) => void;
  onSubmit: () => void;
  submitLabel?: string;
  disabled?: boolean;
  variant?: "light" | "dark";
};

export const EMPTY_LEAD_FORM: LeadFormValues = {
  name: "",
  company: "",
  position: "",
  phone: "",
  email: "",
  interest: "",
  priority: "",
  owner: "",
  notes: "",
};

export function LeadForm({
  values,
  onChange,
  onSubmit,
  submitLabel = "Save Lead",
  disabled,
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

  function setField<K extends keyof LeadFormValues>(
    key: K,
    value: LeadFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  const canSave =
    values.name.trim() &&
    values.company.trim() &&
    values.interest &&
    values.priority &&
    values.owner;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSave || disabled) return;
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
          />
        </Field>
        <Field label="Position" htmlFor="lead-position" labelClass={labelClass}>
          <input
            id="lead-position"
            className={inputClass}
            value={values.position}
            onChange={(e) => setField("position", e.target.value)}
            autoComplete="organization-title"
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
                disabled={disabled}
                onClick={() => setField("interest", interest)}
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
                disabled={disabled}
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

      <Field label="Owner" htmlFor="lead-owner" labelClass={labelClass}>
        <select
          id="lead-owner"
          className={inputClass}
          value={values.owner}
          onChange={(e) => setField("owner", e.target.value as Owner | "")}
          required
        >
          <option value="" disabled>
            Select owner
          </option>
          {OWNERS.map((owner) => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>
      </Field>

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
        />
      </Field>

      <button
        type="submit"
        disabled={!canSave || disabled}
        className="qes-gradient-btn inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitLabel}
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
