"use client";

import { useEffect, useId, useRef, useState } from "react";
import { KeyRound, X } from "lucide-react";

export type GeminiKeyStatus = {
  configured: boolean;
  source: "admin" | "env" | "session" | null;
  hint: string | null;
};

type AdminPanelProps = {
  open: boolean;
  onClose: () => void;
  onStatus: (status: GeminiKeyStatus) => void;
};

export function AdminPanel({ open, onClose, onStatus }: AdminPanelProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<GeminiKeyStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;

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
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/gemini", { credentials: "include" });
        const json = (await res.json()) as GeminiKeyStatus & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Could not load key status");
          return;
        }
        setStatus(json);
        onStatus(json);
      } catch {
        if (!cancelled) setError("Could not load key status");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, onStatus]);

  if (!open) return null;

  async function saveKey(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gemini", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ apiKey }),
      });
      const json = (await res.json()) as GeminiKeyStatus & { error?: string };
      if (!res.ok) {
        setError(json.error || "Could not save key");
        return;
      }
      setStatus(json);
      onStatus(json);
      setApiKey("");
      setSaved(true);
    } catch {
      setError("Could not save key");
    } finally {
      setLoading(false);
    }
  }

  async function clearKey() {
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gemini", {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as GeminiKeyStatus & { error?: string };
      if (!res.ok) {
        setError(json.error || "Could not clear key");
        return;
      }
      setStatus(json);
      onStatus(json);
      setApiKey("");
    } catch {
      setError("Could not clear key");
    } finally {
      setLoading(false);
    }
  }

  const readyLabel =
    status?.source === "admin"
      ? `Shared admin key active (${status.hint})`
      : status?.source === "env"
        ? `Using server env key (${status.hint})`
        : status?.source === "session"
          ? `This-browser key only (${status.hint}) — save again to share with all devices`
          : "No Gemini key yet — OCR will not read cards";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/65"
        aria-label="Close admin"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md overflow-hidden rounded-[20px] border border-[#1e2230] bg-[#11131b] shadow-2xl"
      >
        <div className="qes-header-accent w-full" />
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[rgba(34,211,238,0.35)] bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(139,92,246,0.14))]">
              <KeyRound className="h-4 w-4 text-cyan-300" aria-hidden />
            </div>
            <div>
              <h2
                id={titleId}
                className="text-[15px] font-semibold tracking-[-0.01em] text-slate-50"
              >
                Admin
              </h2>
              <p className="qes-mono text-[11px] tracking-[0.04em] text-[#8b93a7]">
                Gemini OCR key
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] border border-[#2a3040] bg-[#151824] text-slate-400"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={saveKey} className="px-5 pb-5 pt-4">
          <div
            className={`rounded-[12px] border px-3 py-2.5 text-[12.5px] ${
              status?.configured
                ? "border-[rgba(34,211,238,0.28)] bg-[rgba(34,211,238,0.08)] text-cyan-200"
                : "border-[rgba(240,54,155,0.28)] bg-[rgba(240,54,155,0.08)] text-pink-200"
            }`}
          >
            {status ? readyLabel : "Checking key…"}
          </div>

          <label className="mt-4 block text-xs font-medium text-slate-400">
            Gemini API key
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setSaved(false);
              }}
              placeholder="Paste key from Google AI Studio"
              className="field-input-dark mt-1.5"
            />
          </label>
          <p className="mt-2 text-[11px] leading-relaxed text-[#8b93a7]">
            Saved on the server for every device on this deployment. Overrides
            the env key for card scans until you clear it. Prefer setting{" "}
            <span className="qes-mono">GEMINI_API_KEY</span> on Vercel for a
            permanent default.
          </p>

          {error ? (
            <p className="mt-3 text-sm text-rose-400" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="mt-3 text-sm text-cyan-300" role="status">
              Gemini key saved. Try Process Scan again.
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={loading || apiKey.trim().length < 20}
              className="qes-gradient-btn inline-flex min-h-11 flex-1 items-center justify-center rounded-[10px] text-sm font-bold disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save API key"}
            </button>
            {status?.source === "admin" || status?.source === "session" ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => void clearKey()}
                className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-[#2a3040] bg-[#151824] px-4 text-sm font-semibold text-slate-300 disabled:opacity-50"
              >
                Clear
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
