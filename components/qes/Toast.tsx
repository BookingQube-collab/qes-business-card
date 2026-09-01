"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

type ToastProps = {
  message: string | null;
  onDismiss: () => void;
};

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onDismiss, 2200);
    return () => window.clearTimeout(id);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-[10px] border border-[#e6e8ec] bg-white px-4 py-3 text-sm font-medium text-[#0f172a] shadow-lg"
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Check className="h-3.5 w-3.5" aria-hidden />
      </span>
      {message}
    </div>
  );
}
