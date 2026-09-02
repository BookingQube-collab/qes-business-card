"use client";

import { ArrowLeft, KeyRound, LogOut } from "lucide-react";
import { APP_TITLE, BOOTH, EVENT_NAME } from "@/lib/constants";

type AppHeaderProps = {
  view: "capture" | "report";
  leadCount: number;
  geminiConfigured?: boolean;
  onShowReport: () => void;
  onShowCapture: () => void;
  onOpenAdmin: () => void;
  onLogout?: () => void;
};

export function AppHeader({
  view,
  leadCount,
  geminiConfigured = true,
  onShowReport,
  onShowCapture,
  onOpenAdmin,
  onLogout,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="qes-header-accent w-full" />
      <div className="border-b border-[#191d29] bg-[#0c0e14]">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/qes-logo.png"
              alt="Qatar Event Show"
              width={44}
              height={44}
              className="h-10 w-10 shrink-0 rounded-[10px] object-cover sm:h-11 sm:w-11"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <h1 className="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-slate-50">
                {APP_TITLE}
              </h1>
              <p className="qes-mono truncate text-[11px] leading-tight tracking-[0.04em] text-[#8b93a7]">
                {EVENT_NAME} / {BOOTH}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {view === "capture" ? (
              <button
                type="button"
                onClick={onShowReport}
                className="inline-flex min-h-11 items-center gap-[11px] rounded-[10px] border border-[rgba(34,211,238,0.35)] bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(139,92,246,0.12))] py-[9px] pr-2 pl-4 text-[13px] font-semibold text-slate-200"
              >
                Lead Report
                <span className="inline-flex items-center justify-center rounded-lg bg-[linear-gradient(135deg,#22d3ee,#8b5cf6_55%,#f0369b)] px-2.5 py-[5px] text-[12.5px] font-bold tabular-nums text-[#07080c]">
                  {leadCount}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onShowCapture}
                className="inline-flex min-h-11 items-center gap-[9px] rounded-[10px] border border-[#2a3040] bg-[#151824] px-4 py-[9px] text-[13px] font-semibold text-slate-300"
              >
                <ArrowLeft className="h-[15px] w-[15px]" aria-hidden />
                <span className="hidden sm:inline">Back to Scanner</span>
                <span className="sm:hidden">Scanner</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[rgba(139,92,246,0.4)] bg-[linear-gradient(135deg,rgba(34,211,238,0.1),rgba(139,92,246,0.16))] px-3 text-[13px] font-semibold text-slate-100"
              aria-label="Admin — Gemini API key"
              title="Admin — Gemini API key"
            >
              <KeyRound className="h-4 w-4 text-cyan-300" aria-hidden />
              <span className="hidden sm:inline">Admin</span>
              <span
                className={`h-2 w-2 rounded-full ${
                  geminiConfigured
                    ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                    : "bg-pink-400 shadow-[0_0_8px_rgba(240,54,155,0.8)]"
                }`}
                aria-hidden
              />
            </button>

            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[rgba(240,54,155,0.4)] bg-[rgba(240,54,155,0.1)] px-3 text-[13px] font-semibold text-slate-100"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="h-4 w-4 text-pink-300" aria-hidden />
                <span className="hidden sm:inline">Log out</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
