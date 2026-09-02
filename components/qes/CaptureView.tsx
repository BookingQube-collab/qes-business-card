"use client";

import { RotateCcw } from "lucide-react";
import {
  CardImagePicker,
  ExtractionIdle,
  useScanChannels,
} from "@/components/qes/CardImagePicker";
import { LeadForm, type LeadFormValues } from "@/components/qes/LeadForm";
import type { LeadStats } from "@/types/lead";

export type CaptureStep = "pick" | "preview" | "reading" | "form";

/**
 * Phone + tablet booth layout uses Tailwind `lg` (1024px).
 * Below that: header + scanner only, then extract + Retry after OCR.
 */
type CaptureViewProps = {
  stats: LeadStats;
  avgScanMs: number | null;
  step: CaptureStep;
  imageUrl: string | null;
  formValues: LeadFormValues;
  ocrError?: string | null;
  geminiConfigured?: boolean;
  onImageSelected: (file: File, objectUrl: string) => void;
  onRetake: () => void;
  onRemove: () => void;
  onReadCard: () => void;
  onRetry: () => void;
  onFormChange: (values: LeadFormValues) => void;
  onSave: () => void;
  saving?: boolean;
};

function telemetryStatus(step: CaptureStep): {
  label: string;
  color: string;
} {
  if (step === "form") return { label: "FIELDS READY", color: "#4ade80" };
  if (step === "reading") return { label: "PROCESSING", color: "#22d3ee" };
  return { label: "READY", color: "#8b93a7" };
}

function moduleStatus(step: CaptureStep): { label: string; color: string } {
  if (step === "form") return { label: "CAPTURE COMPLETE", color: "#4ade80" };
  if (step === "reading") return { label: "SCANNING", color: "#22d3ee" };
  return { label: "STANDBY", color: "#8b93a7" };
}

function extractionStatus(step: CaptureStep): string {
  if (step === "form") return "COMPLETE";
  if (step === "reading") return "EXTRACTING";
  return "IDLE";
}

export function CaptureView({
  stats,
  avgScanMs,
  step,
  imageUrl,
  formValues,
  ocrError,
  geminiConfigured = true,
  onImageSelected,
  onRetake,
  onRemove,
  onReadCard,
  onRetry,
  onFormChange,
  onSave,
  saving,
}: CaptureViewProps) {
  const channelPct = useScanChannels(step);
  const tele = telemetryStatus(step);
  const mod = moduleStatus(step);
  const showForm = step === "form";
  const processing = step === "reading";
  const attachedUrl =
    step === "preview" || step === "reading" || step === "form"
      ? imageUrl
      : null;

  const telemetry = [
    { k: "SESSION", v: "QES-2026-D14", color: "#cbd5e1" },
    { k: "SENSOR", v: "REAR CAM 12MP", color: "#cbd5e1" },
    { k: "PIPELINE", v: "CARD-OCR v3.2", color: "#a5f3fc" },
    { k: "CARDS TODAY", v: String(stats.today), color: "#4ade80" },
    { k: "STATUS", v: tele.label, color: tele.color },
  ];

  return (
    <div className="qes-capture-bg min-h-[calc(100dvh-65px)]">
      <div className="relative z-10 mx-auto max-w-[1360px] px-4 pb-10 pt-4 sm:px-5">
        {/* Critical only: compact key banner on phone/tablet */}
        {!geminiConfigured ? (
          <div
            className="mb-3 rounded-lg border border-[rgba(240,54,155,0.35)] bg-[rgba(240,54,155,0.1)] px-3 py-2 text-[13px] text-pink-200 lg:hidden"
            role="status"
          >
            Gemini API key needed — tap Admin in the header to scan cards.
          </div>
        ) : null}

        {/* Telemetry strip — desktop only */}
        <div className="qes-mono mb-4 hidden overflow-hidden rounded-xl border border-[#1b2130] bg-[linear-gradient(#0d1017,#0a0c11)] lg:block">
          <div className="flex flex-wrap">
            {telemetry.map((item, i) => (
              <div
                key={item.k}
                className={`flex min-w-[140px] flex-1 flex-col gap-[5px] px-3.5 py-2.5 ${
                  i < telemetry.length - 1 ? "border-r border-[#161b27]" : ""
                }`}
              >
                <div className="text-[9.5px] tracking-[0.14em] text-[#5b657a]">
                  {item.k}
                </div>
                <div
                  className="text-[12.5px] tracking-[0.02em]"
                  style={{ color: item.color }}
                >
                  {item.v}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phone/tablet booth title — no attached-card preview */}
        <p className="mb-4 text-[15px] font-medium tracking-[-0.01em] text-slate-200 lg:hidden">
          QES Business Card Leads /D 14
        </p>

        {/*
          Phone / tablet (< lg / 1024px): scanner only until extract, then
          extract + Retry (+ Save Lead). Desktop keeps side-by-side modules.
        */}
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          <div className={showForm ? "hidden lg:block" : undefined}>
            <CardImagePicker
              imageUrl={attachedUrl}
              channelPct={channelPct}
              statusLabel={mod.label}
              statusColor={mod.color}
              processing={processing}
              onImageSelected={onImageSelected}
              onRetake={onRetake}
              onRemove={onRemove}
              onContinue={onReadCard}
              disabled={saving || processing}
            />
          </div>

          <section
            className={`overflow-hidden rounded-[14px] border border-[#1b2130] bg-[linear-gradient(#0d1017,#0a0c11)] ${
              showForm ? "" : "hidden lg:block"
            }`}
          >
            <div className="qes-mono flex items-center justify-between gap-3 border-b border-[#161b27] px-4 py-3">
              <div className="text-[11px] tracking-[0.16em] text-[#8b93a7]">
                02 / EXTRACTION OUTPUT
              </div>
              <div className="text-[10.5px] tracking-[0.1em] text-[#5b657a]">
                {saving ? "SAVING" : extractionStatus(step)}
              </div>
            </div>

            {showForm ? (
              <div className="relative space-y-4 p-4">
                {saving ? (
                  <div
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-b-[14px] bg-[#0a0c11]/88 px-6 backdrop-blur-[2px]"
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <div
                      className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent"
                      aria-hidden
                    />
                    <div className="qes-mono text-[11px] tracking-[0.14em] text-cyan-300">
                      SAVING LEAD
                    </div>
                    <div
                      className="h-1.5 w-44 overflow-hidden rounded-full bg-[#1b2130]"
                      aria-hidden
                    >
                      <div className="qes-save-indeterminate h-full w-1/2 rounded-full bg-gradient-to-r from-cyan-500/30 via-cyan-400 to-cyan-500/30" />
                    </div>
                    <p className="max-w-[260px] text-center text-[13px] text-[#7c869b]">
                      Uploading card image and saving lead…
                    </p>
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={saving}
                  onClick={onRetry}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[11px] border border-[#242a38] bg-[#11141d] px-3 text-sm font-medium text-slate-300 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Retry
                </button>
                {imageUrl ? (
                  <div className="hidden overflow-hidden rounded-xl border border-[#202634] bg-[#080a0f] lg:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Captured business card"
                      className="mx-auto max-h-28 w-full object-contain p-2"
                    />
                  </div>
                ) : null}
                {ocrError ? (
                  <p
                    className="rounded-lg border border-[#3f1d2e] bg-[#1a0f14] px-3 py-2.5 text-[13px] leading-relaxed text-[#fb7185]"
                    role="alert"
                  >
                    {ocrError} You can enter the details manually below.
                  </p>
                ) : (
                  <div className="qes-mono mb-1 text-[10px] tracking-[0.14em] text-[#4ade80]">
                    FIELDS READY — CONFIRM &amp; SAVE
                  </div>
                )}
                <LeadForm
                  values={formValues}
                  onChange={onFormChange}
                  onSubmit={onSave}
                  disabled={saving}
                  busy={saving}
                  variant="dark"
                />
              </div>
            ) : processing ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                <div className="qes-mono text-[11px] tracking-[0.14em] text-cyan-300">
                  RUNNING OCR PIPELINE
                </div>
                <p className="max-w-[280px] text-[13px] text-[#7c869b]">
                  Extracting name, company, phone and email from the card…
                </p>
              </div>
            ) : (
              <ExtractionIdle />
            )}
          </section>
        </div>

        {/* KPI row — desktop only */}
        <div className="mt-5 hidden grid-cols-2 gap-3 sm:grid-cols-4 lg:grid">
          <Kpi
            label="TOTAL COLLECTED"
            value={stats.total}
            valueClass="qes-gradient-text text-[34px] font-bold"
          />
          <Kpi
            label="TODAY"
            value={stats.today}
            valueClass="text-[34px] font-semibold text-slate-200"
          />
          <Kpi
            label="HOT LEADS"
            value={stats.hot}
            valueClass="text-[34px] font-semibold text-[#fb7185]"
          />
          <Kpi
            label="AVG SCAN TIME"
            value={avgScanMs != null ? `${avgScanMs} ms` : "—"}
            valueClass="text-[34px] font-semibold text-[#a5f3fc]"
          />
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number | string;
  valueClass: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#1b2130] bg-[linear-gradient(#0d1017,#0a0c11)] px-[18px] py-4">
      <div className="qes-mono text-[9.5px] tracking-[0.14em] text-[#5b657a]">
        {label}
      </div>
      <div className={`leading-none tracking-[-0.035em] tabular-nums ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}
