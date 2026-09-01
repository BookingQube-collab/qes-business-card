"use client";

import {
  CardImagePicker,
  ExtractionIdle,
  useScanChannels,
} from "@/components/qes/CardImagePicker";
import { LeadForm, type LeadFormValues } from "@/components/qes/LeadForm";
import type { LeadStats } from "@/types/lead";

export type CaptureStep = "pick" | "preview" | "reading" | "form";

type CaptureViewProps = {
  stats: LeadStats;
  step: CaptureStep;
  imageUrl: string | null;
  formValues: LeadFormValues;
  onImageSelected: (file: File, objectUrl: string) => void;
  onRetake: () => void;
  onRemove: () => void;
  onReadCard: () => void;
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
  step,
  imageUrl,
  formValues,
  onImageSelected,
  onRetake,
  onRemove,
  onReadCard,
  onFormChange,
  onSave,
  saving,
}: CaptureViewProps) {
  const channelPct = useScanChannels(step);
  const tele = telemetryStatus(step);
  const mod = moduleStatus(step);
  const showForm = step === "form";
  const processing = step === "reading";

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
        {/* Telemetry strip */}
        <div className="qes-mono mb-4 overflow-hidden rounded-xl border border-[#1b2130] bg-[linear-gradient(#0d1017,#0a0c11)]">
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

        {/* Main modules */}
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          <CardImagePicker
            imageUrl={
              step === "preview" || step === "reading" || step === "form"
                ? imageUrl
                : null
            }
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

          <section className="overflow-hidden rounded-[14px] border border-[#1b2130] bg-[linear-gradient(#0d1017,#0a0c11)]">
            <div className="qes-mono flex items-center justify-between gap-3 border-b border-[#161b27] px-4 py-3">
              <div className="text-[11px] tracking-[0.16em] text-[#8b93a7]">
                02 / EXTRACTION OUTPUT
              </div>
              <div className="text-[10.5px] tracking-[0.1em] text-[#5b657a]">
                {extractionStatus(step)}
              </div>
            </div>

            {showForm ? (
              <div className="space-y-4 p-4">
                {imageUrl ? (
                  <div className="overflow-hidden rounded-xl border border-[#202634] bg-[#080a0f]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Captured business card"
                      className="mx-auto max-h-28 w-full object-contain p-2"
                    />
                  </div>
                ) : null}
                <div className="qes-mono mb-1 text-[10px] tracking-[0.14em] text-[#4ade80]">
                  FIELDS READY — CONFIRM &amp; SAVE
                </div>
                <LeadForm
                  values={formValues}
                  onChange={onFormChange}
                  onSubmit={onSave}
                  disabled={saving}
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

        {/* KPI row */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            value="2.1s"
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
