"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  applyCameraFocus,
  captureFromCamera,
  stopMediaStream,
  supportsGetUserMedia,
} from "@/lib/capture-frame";

const CAMERA_UNAVAILABLE =
  "Camera unavailable. Use Upload Image Instead.";

type CardImagePickerProps = {
  imageUrl: string | null;
  channelPct: number;
  statusLabel: string;
  statusColor: string;
  processing: boolean;
  onImageSelected: (file: File, objectUrl: string) => void;
  onRetake: () => void;
  onRemove: () => void;
  onContinue: () => void;
  disabled?: boolean;
};

export function CardImagePicker({
  imageUrl,
  channelPct,
  statusLabel,
  statusColor,
  processing,
  onImageSelected,
  onRetake,
  onRemove,
  onContinue,
  disabled,
}: CardImagePickerProps) {
  const cameraFallbackInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraLive, setCameraLive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const startGenRef = useRef(0);

  function stopCamera() {
    startGenRef.current += 1;
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      video.onloadedmetadata = null;
    }
    setCameraLive(false);
    setCameraStarting(false);
    setCameraReady(false);
    setCapturing(false);
  }

  useEffect(() => {
    return () => {
      startGenRef.current += 1;
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  // Hardware teardown only when preview/processing owns the viewfinder.
  useEffect(() => {
    if (!imageUrl && !processing) return;
    startGenRef.current += 1;
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      video.onloadedmetadata = null;
    }
  }, [imageUrl, processing]);

  async function startCamera() {
    setCameraError(null);

    if (!supportsGetUserMedia()) {
      cameraFallbackInputRef.current?.click();
      return;
    }

    stopCamera();
    const gen = startGenRef.current;
    setCameraStarting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
        audio: false,
      });

      if (gen !== startGenRef.current) {
        stopMediaStream(stream);
        return;
      }

      await applyCameraFocus(stream);
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopMediaStream(stream);
        streamRef.current = null;
        setCameraStarting(false);
        // Video node missing — fall back to capture input
        cameraFallbackInputRef.current?.click();
        return;
      }
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.muted = true;

      const markReady = () => {
        if (gen === startGenRef.current && video.videoWidth > 0) {
          setCameraReady(true);
        }
      };
      video.onloadedmetadata = markReady;
      if (video.readyState >= 1) markReady();

      try {
        await video.play();
      } catch {
        /* autoplay policy — still show frame once metadata loads */
      }

      if (gen !== startGenRef.current) {
        stopMediaStream(stream);
        streamRef.current = null;
        return;
      }

      setCameraLive(true);
      setCameraStarting(false);
      markReady();
    } catch {
      if (gen !== startGenRef.current) return;
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      setCameraLive(false);
      setCameraStarting(false);
      setCameraReady(false);
      // Permission denied / no device — fall back to native capture picker
      cameraFallbackInputRef.current?.click();
      setCameraError(CAMERA_UNAVAILABLE);
    }
  }

  async function handleShutter() {
    const video = videoRef.current;
    if (!video || !streamRef.current || capturing || !cameraReady) return;
    if (!video.videoWidth) {
      setCameraError(CAMERA_UNAVAILABLE);
      stopCamera();
      cameraFallbackInputRef.current?.click();
      return;
    }
    setCapturing(true);
    setCameraError(null);
    try {
      const file = await captureFromCamera(
        video,
        streamRef.current,
        "business-card-scan",
      );
      const objectUrl = URL.createObjectURL(file);
      stopCamera();
      onImageSelected(file, objectUrl);
    } catch {
      stopCamera();
      setCameraError(CAMERA_UNAVAILABLE);
      cameraFallbackInputRef.current?.click();
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    stopCamera();
    setCameraError(null);
    onImageSelected(file, URL.createObjectURL(file));
  }

  function handleRemove() {
    stopCamera();
    setCameraError(null);
    onRemove();
  }

  function handleRetake() {
    stopCamera();
    setCameraError(null);
    onRetake();
    requestAnimationFrame(() => {
      void startCamera();
    });
  }

  function handleCancelCamera() {
    stopCamera();
    setCameraError(null);
  }

  const pctLabel = channelPct <= 0 ? "--" : `${Math.round(channelPct)}%`;
  const channels = [
    { label: "EDGE DETECT", pct: Math.min(channelPct, 100) },
    {
      label: "TEXT EXTRACT",
      pct: channelPct <= 0 ? 0 : Math.min(Math.max(channelPct - 8, 0), 100),
    },
    {
      label: "FIELD MATCH",
      pct: channelPct <= 0 ? 0 : Math.min(Math.max(channelPct - 16, 0), 100),
    },
  ];

  const showIdleViewfinder = !imageUrl;

  return (
    <section className="overflow-hidden rounded-[14px] border border-[#1b2130] bg-[linear-gradient(#0d1017,#0a0c11)]">
      <div className="qes-mono flex items-center justify-between gap-3 border-b border-[#161b27] px-4 py-3">
        <div className="text-[11px] tracking-[0.16em] text-[#8b93a7]">
          01 / CAPTURE MODULE
        </div>
        <div className="flex items-center gap-[7px] text-[10.5px] tracking-[0.1em] text-[#8b93a7]">
          <span
            className="qes-anim-blink h-1.5 w-1.5 rounded-full"
            style={{
              background: cameraLive ? "#22d3ee" : statusColor,
            }}
            aria-hidden
          />
          <span style={{ color: cameraLive ? "#22d3ee" : statusColor }}>
            {cameraLive ? "LIVE CAM" : statusLabel}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-[#202634] bg-[radial-gradient(130%_130%_at_50%_0%,#151a26,#080a0f)]">
          {/* Always mount video so startCamera can attach stream before live UI paints */}
          <video
            ref={videoRef}
            className={`absolute inset-0 z-[5] h-full w-full object-cover ${
              cameraLive && !imageUrl ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            playsInline
            muted
            autoPlay
            aria-hidden={!cameraLive}
          />

          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Business card preview"
              className="relative z-10 h-full w-full object-contain p-3"
            />
          ) : cameraLive ? (
            <>
              <div
                className="pointer-events-none absolute inset-0 z-[6]"
                style={{
                  background:
                    "radial-gradient(120% 120% at 50% 40%, transparent 30%, rgba(7,8,12,0.45) 100%)",
                }}
                aria-hidden
              />
              <div className="absolute left-3.5 top-3.5 z-[7] h-6 w-6 border-l-2 border-t-2 border-[#22d3ee]" />
              <div className="absolute right-3.5 top-3.5 z-[7] h-6 w-6 border-r-2 border-t-2 border-[#8b5cf6]" />
              <div className="absolute bottom-3.5 left-3.5 z-[7] h-6 w-6 border-b-2 border-l-2 border-[#f0369b]" />
              <div className="absolute bottom-3.5 right-3.5 z-[7] h-6 w-6 border-b-2 border-r-2 border-[#ff8a3d]" />

              {/* Desktop (lg+): overlay on viewfinder. Mobile/tablet: below feed */}
              <div className="absolute inset-x-0 bottom-2 z-[8] hidden items-end justify-between gap-3 px-3 pb-1 lg:flex">
                <button
                  type="button"
                  disabled={disabled || capturing}
                  onClick={handleCancelCamera}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-[#242a38] bg-[rgba(17,20,29,0.88)] px-3 text-sm font-medium text-slate-300 disabled:opacity-50"
                  aria-label="Cancel camera"
                >
                  <X className="h-4 w-4" aria-hidden />
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={disabled || capturing || !cameraReady}
                  onClick={() => void handleShutter()}
                  className="qes-shutter-btn disabled:opacity-50"
                  aria-label="Capture photo"
                >
                  <span className="qes-shutter-btn__ring" aria-hidden />
                  <span className="qes-shutter-btn__core" aria-hidden />
                  <span className="qes-shutter-btn__label qes-mono">Capture</span>
                </button>
                <div className="min-h-11 min-w-[4.5rem]" aria-hidden />
              </div>
            </>
          ) : showIdleViewfinder ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/booth-feed.png"
                alt="Booth camera feed"
                className="qes-anim-feed absolute inset-0 h-full w-full object-cover opacity-[0.34]"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 120% at 50% 40%, transparent 30%, rgba(7,8,12,0.72) 100%)",
                }}
                aria-hidden
              />
              <div
                className="qes-viewfinder-grid qes-anim-grid absolute inset-0 opacity-55"
                aria-hidden
              />
              <div
                className="absolute left-0 right-0 top-1/2 h-px bg-[rgba(139,92,246,0.28)]"
                aria-hidden
              />
              <div
                className="absolute bottom-0 left-1/2 top-0 w-px bg-[rgba(139,92,246,0.28)]"
                aria-hidden
              />
              <div
                className="absolute left-[calc(50%-13px)] top-[calc(50%-13px)] h-[26px] w-[26px] rounded-full border border-[rgba(34,211,238,0.7)]"
                aria-hidden
              />

              <div className="absolute left-3.5 top-3.5 h-6 w-6 border-l-2 border-t-2 border-[#22d3ee]" />
              <div className="absolute right-3.5 top-3.5 h-6 w-6 border-r-2 border-t-2 border-[#8b5cf6]" />
              <div className="absolute bottom-3.5 left-3.5 h-6 w-6 border-b-2 border-l-2 border-[#f0369b]" />
              <div className="absolute bottom-3.5 right-3.5 h-6 w-6 border-b-2 border-r-2 border-[#ff8a3d]" />

              <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div className="qes-anim-focus absolute inset-[22%_12%] rounded-lg border border-[rgba(34,211,238,0.32)]" />
                <div
                  className="qes-anim-drift absolute left-[12%] right-[12%] top-[calc(50%-1px)] h-0.5"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, rgba(34,211,238,0.55) 8px, transparent 8px)",
                    backgroundSize: "22px 2px",
                  }}
                />
                {processing ? (
                  <div className="qes-anim-sweep absolute left-[12%] right-[12%] h-0.5 bg-[linear-gradient(90deg,transparent,#22d3ee,transparent)] shadow-[0_0_12px_#22d3ee]" />
                ) : null}
                <div className="qes-anim-arrow-l absolute left-[calc(12%-20px)] top-[calc(50%-7px)] text-[#22d3ee]">
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                </div>
                <div className="qes-anim-arrow-r absolute right-[calc(12%-20px)] top-[calc(50%-7px)] text-[#f0369b]">
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
                </div>
                <div className="qes-anim-align qes-mono absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2 text-[10px] tracking-[0.16em] text-[#9aa4b8]">
                  <span className="h-[5px] w-[5px] rounded-full bg-[#22d3ee] shadow-[0_0_8px_#22d3ee]" />
                  ALIGN CARD WITHIN RETICLE
                  <span className="h-[5px] w-[5px] rounded-full bg-[#f0369b] shadow-[0_0_8px_#f0369b]" />
                </div>
              </div>
            </>
          ) : null}
        </div>

        {cameraError ? (
          <p
            className="qes-mono mt-3 text-center text-[11px] tracking-[0.08em] text-[#f0369b]"
            role="alert"
          >
            {cameraError}
          </p>
        ) : null}

        <div className="qes-mono mt-3.5 flex flex-col gap-[9px]">
          {channels.map((ch) => (
            <div key={ch.label} className="flex items-center gap-2.5">
              <div className="w-[118px] shrink-0 text-[10px] tracking-[0.12em] text-[#6b7488]">
                {ch.label}
              </div>
              <div className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-[3px] bg-[#161b27]">
                <div
                  className="h-full rounded-[3px] bg-[linear-gradient(90deg,#22d3ee,#8b5cf6)] transition-[width] duration-[450ms]"
                  style={{ width: `${ch.pct}%` }}
                />
              </div>
              <div className="w-11 shrink-0 text-right text-[10.5px] text-[#4b5566]">
                {channelPct <= 0 ? "--" : `${Math.round(ch.pct)}%`}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2.5">
          {imageUrl && !processing ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={handleRetake}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[11px] border border-[#242a38] bg-[#11141d] px-3 text-sm font-medium text-slate-300 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Retake
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={handleRemove}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[11px] border border-[#242a38] bg-[#11141d] px-3 text-sm font-medium text-slate-300 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Remove
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={onContinue}
                className="qes-gradient-btn inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-xl px-5 text-[13px] font-bold uppercase tracking-[0.04em] disabled:opacity-50"
              >
                <Camera className="h-[18px] w-[18px]" aria-hidden />
                Process Scan
              </button>
            </div>
          ) : processing ? (
            <div className="qes-mono flex min-h-14 items-center justify-center rounded-xl border border-[#242a38] bg-[#11141d] text-[11px] tracking-[0.14em] text-cyan-300">
              PROCESSING PIPELINE…
            </div>
          ) : cameraLive ? (
            <div className="space-y-3">
              <p className="qes-mono text-center text-[11px] tracking-[0.12em] text-[#8b93a7]">
                Align the card, then tap Capture
              </p>
              {/* Phone / tablet (below lg): thumb-friendly controls under status rows */}
              <div className="flex items-end justify-between gap-3 px-1 lg:hidden">
                <button
                  type="button"
                  disabled={disabled || capturing}
                  onClick={handleCancelCamera}
                  className="inline-flex min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-full border border-[#242a38] bg-[#11141d] px-4 text-sm font-medium text-slate-300 disabled:opacity-50"
                  aria-label="Cancel camera"
                >
                  <X className="h-4 w-4" aria-hidden />
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={disabled || capturing || !cameraReady}
                  onClick={() => void handleShutter()}
                  className="qes-shutter-btn disabled:opacity-50"
                  aria-label="Capture photo"
                >
                  <span className="qes-shutter-btn__ring" aria-hidden />
                  <span className="qes-shutter-btn__core" aria-hidden />
                  <span className="qes-shutter-btn__label qes-mono">Capture</span>
                </button>
                <div className="min-h-12 min-w-[4.5rem]" aria-hidden />
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={disabled || cameraStarting}
                onClick={() => void startCamera()}
                className="qes-gradient-btn inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-xl px-5 text-[13px] font-bold uppercase tracking-[0.04em] disabled:opacity-50"
              >
                <Camera className="h-[18px] w-[18px]" aria-hidden />
                {cameraStarting ? "Starting Camera…" : "Scan Business Card"}
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => uploadInputRef.current?.click()}
                className="qes-mono inline-flex min-h-[46px] w-full items-center justify-center gap-[9px] rounded-[11px] border border-[#242a38] bg-[#11141d] px-5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#a9b3c6] disabled:opacity-50"
              >
                <ImagePlus
                  className="h-[15px] w-[15px] text-[#f0369b]"
                  strokeWidth={1.9}
                  aria-hidden
                />
                Upload Image Instead
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scan fallback only — never used by Upload */}
      <input
        ref={cameraFallbackInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Scan business card with camera"
        onChange={handleFileChange}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Upload business card image"
        onChange={handleFileChange}
      />
      <span className="sr-only">{pctLabel}</span>
    </section>
  );
}

export function ExtractionIdle() {
  return (
    <div className="flex flex-col items-center gap-3.5 px-6 py-[46px] text-center">
      <div className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full border border-[#232a3a]">
        <div className="qes-anim-ring absolute inset-[-1px] rounded-full border border-[rgba(34,211,238,0.45)]" />
        <div className="qes-anim-pulse h-2.5 w-2.5 rounded-full bg-[#22d3ee] shadow-[0_0_12px_#22d3ee]" />
      </div>
      <div className="qes-mono text-[11px] uppercase tracking-[0.14em] text-[#6b7488]">
        Awaiting card capture
      </div>
      <p className="max-w-[280px] text-[13px] leading-relaxed text-[#7c869b]">
        Name, company, mobile and email are read from the card automatically —
        you only set interest and priority.
      </p>
    </div>
  );
}

/** @deprecated kept for any leftover imports — use ExtractionIdle */
export function ReadingOverlay() {
  return <ExtractionIdle />;
}

export function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`h-1 w-6 rounded-full ${
            n <= step
              ? "bg-[linear-gradient(90deg,#22d3ee,#8b5cf6)]"
              : "bg-[#2a2f3f]"
          }`}
        />
      ))}
    </div>
  );
}

/** Channel bar progress derived from capture step (no artificial delays). */
export function useScanChannels(step: "pick" | "preview" | "reading" | "form") {
  if (step === "form") return 100;
  if (step === "reading") return 92;
  return 0;
}
