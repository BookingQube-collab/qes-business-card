"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  CheckCircle2,
  FileImage,
  FileText,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  EMPTY_LEAD_FORM,
  LeadForm,
  type LeadFormValues,
} from "@/components/qes/LeadForm";
import { SearchableSelect } from "@/components/qes/SearchableSelect";
import { DEFAULT_OWNER, INTERESTS, PRIORITIES } from "@/lib/constants";
import {
  compressCardImage,
  compressCardImageForUpload,
} from "@/lib/compress-image";
import { buildLeadNotes } from "@/lib/lead-form-utils";
import { createId, normalizeEmail, normalizePhone } from "@/lib/lead-utils";
import { getLeadApi } from "@/lib/leads-api";
import { normalizeOcrEmail } from "@/lib/ocr-email";
import {
  formatQatarDateLabel,
  qatarDayToCreatedAtIso,
  qatarYesterdayKey,
} from "@/lib/qatar-date";
import {
  isImageFile,
  isPdfFile,
  MAX_BULK_ITEMS,
  MAX_PDF_PAGES,
  pdfFileToPageImages,
  snapshotFileList,
} from "@/lib/pdf-pages";
import type {
  CreateLeadInput,
  Interest,
  Lead,
  Priority,
} from "@/types/lead";
import type { ExtractedBusinessCard } from "@/types/ocr";

type ItemStatus =
  | "queued"
  | "extracting"
  | "ready"
  | "error"
  | "saving"
  | "saved"
  | "skipped";

type BulkItem = {
  id: string;
  label: string;
  file: File;
  previewUrl: string;
  status: ItemStatus;
  error?: string;
  form: LeadFormValues;
  expanded: boolean;
};

type BulkImportViewProps = {
  open: boolean;
  onClose: () => void;
  existingLeads: Lead[];
  onLeadSaved: (lead: Lead) => void;
  onToast: (message: string) => void;
  geminiConfigured?: boolean;
  onOpenAdmin?: () => void;
};

const EXTRACT_GAP_MS = 400;

function canSaveForm(form: LeadFormValues): boolean {
  return Boolean(
    form.name.trim() &&
      form.company.trim() &&
      form.interest &&
      form.priority &&
      (form.interest !== "Other" || form.interestOther.trim()),
  );
}

async function extractViaApi(file: File): Promise<ExtractedBusinessCard> {
  const body = new FormData();
  body.append("image", file, file.name || "business-card.jpg");
  const res = await fetch("/api/business-card/extract", {
    method: "POST",
    body,
    credentials: "include",
  });
  let json: {
    extracted?: ExtractedBusinessCard;
    error?: string;
    demo?: boolean;
  } = {};
  try {
    json = (await res.json()) as typeof json;
  } catch {
    /* non-JSON */
  }
  if (json.demo) {
    throw new Error("Set a Gemini API key in Admin before scanning cards.");
  }
  if (!res.ok || !json.extracted) {
    throw new Error(
      json.error ||
        "We could not read this card clearly. Enter details manually.",
    );
  }
  return json.extracted;
}

function extractedToForm(
  extracted: ExtractedBusinessCard,
  defaults: { interest: Interest | ""; priority: Priority | "" },
): LeadFormValues {
  return {
    ...EMPTY_LEAD_FORM,
    name: extracted.name ?? "",
    company: extracted.company ?? "",
    position: extracted.position ?? "",
    phone: extracted.phone ?? "",
    email: normalizeOcrEmail(extracted.email) ?? "",
    interest: defaults.interest,
    interestOther: "",
    priority: defaults.priority,
    notes: "",
  };
}

export function BulkImportView({
  open,
  onClose,
  existingLeads,
  onLeadSaved,
  onToast,
  geminiConfigured = true,
  onOpenAdmin,
}: BulkImportViewProps) {
  const titleId = useId();
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const api = useRef(getLeadApi()).current;
  const abortRef = useRef(0);
  const queueBusyRef = useRef(false);
  const itemsRef = useRef<BulkItem[]>([]);
  const defaultsRef = useRef({
    interest: "" as Interest | "",
    priority: "" as Priority | "",
  });

  const [eventDate, setEventDate] = useState(qatarYesterdayKey);
  const [defaultInterest, setDefaultInterest] = useState<Interest | "">("");
  const [defaultPriority, setDefaultPriority] = useState<Priority | "">("");
  const [items, setItems] = useState<BulkItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Preparing files…");
  const [batchSaving, setBatchSaving] = useState(false);
  const [pdfNote, setPdfNote] = useState<string | null>(null);
  const [pdfNoteIsError, setPdfNoteIsError] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    defaultsRef.current = {
      interest: defaultInterest,
      priority: defaultPriority,
    };
  }, [defaultInterest, defaultPriority]);

  const revokeAll = useCallback((list: BulkItem[]) => {
    for (const item of list) {
      if (item.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;
    abortRef.current += 1;
    setItems((prev) => {
      revokeAll(prev);
      return [];
    });
    setPdfNote(null);
    setPdfNoteIsError(false);
    setLoadingFiles(false);
    setLoadingLabel("Preparing files…");
    setBatchSaving(false);
    setEventDate(qatarYesterdayKey());
  }, [open, revokeAll]);

  useEffect(() => {
    return () => {
      abortRef.current += 1;
      revokeAll(itemsRef.current);
    };
  }, [revokeAll]);

  const patchItem = useCallback((id: string, patch: Partial<BulkItem>) => {
    setItems((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      );
      itemsRef.current = next;
      return next;
    });
  }, []);

  const runExtractQueue = useCallback(async () => {
    if (queueBusyRef.current) return;
    queueBusyRef.current = true;
    const token = abortRef.current;
    try {
      while (token === abortRef.current) {
        const target = itemsRef.current.find((i) => i.status === "queued");
        if (!target) break;

        patchItem(target.id, { status: "extracting", error: undefined });
        const defaults = defaultsRef.current;
        try {
          const compressed = await compressCardImage(target.file);
          const extracted = await extractViaApi(compressed);
          if (token !== abortRef.current) return;
          patchItem(target.id, {
            status: "ready",
            file: compressed,
            form: extractedToForm(extracted, defaults),
            expanded: true,
          });
        } catch (err) {
          if (token !== abortRef.current) return;
          const message =
            err instanceof Error
              ? err.message
              : "Could not read this card. Enter details manually.";
          patchItem(target.id, {
            status: "ready",
            error: message,
            form: {
              ...EMPTY_LEAD_FORM,
              interest: defaults.interest,
              priority: defaults.priority,
            },
            expanded: true,
          });
          if (/gemini api key|admin/i.test(message)) {
            onOpenAdmin?.();
          }
        }
        await new Promise((r) => setTimeout(r, EXTRACT_GAP_MS));
      }
    } finally {
      queueBusyRef.current = false;
      if (
        token === abortRef.current &&
        itemsRef.current.some((i) => i.status === "queued")
      ) {
        void runExtractQueue();
      }
    }
  }, [onOpenAdmin, patchItem]);

  useEffect(() => {
    if (!open) return;
    if (items.some((i) => i.status === "queued") && !queueBusyRef.current) {
      void runExtractQueue();
    }
  }, [items, open, runExtractQueue]);

  async function addFiles(files: File[]) {
    if (files.length === 0) return;

    setLoadingFiles(true);
    setLoadingLabel(
      files.some(isPdfFile) ? "Reading PDF…" : "Adding images…",
    );
    setPdfNote(null);
    setPdfNoteIsError(false);
    const session = abortRef.current;
    const nextItems: BulkItem[] = [];
    let enqueued = 0;

    try {
      let remaining = MAX_BULK_ITEMS - itemsRef.current.length;
      if (remaining <= 0) {
        onToast(`Limit is ${MAX_BULK_ITEMS} cards per import.`);
        return;
      }

      for (const file of files) {
        if (!openRef.current || session !== abortRef.current) {
          onToast("Import cancelled — modal was closed.");
          return;
        }
        if (remaining <= 0) {
          onToast(`Stopped at ${MAX_BULK_ITEMS} cards (import limit).`);
          break;
        }

        if (isPdfFile(file)) {
          try {
            setLoadingLabel(`Reading ${file.name || "PDF"}…`);
            const split = await pdfFileToPageImages(file, {
              maxPages: Math.min(MAX_PDF_PAGES, remaining),
              onProgress: (done, total) => {
                setLoadingLabel(
                  `Reading PDF page ${done} of ${total}…`,
                );
              },
            });
            if (!openRef.current || session !== abortRef.current) {
              for (const page of split.pages) {
                if (page.objectUrl.startsWith("blob:")) {
                  URL.revokeObjectURL(page.objectUrl);
                }
              }
              onToast("Import cancelled — modal was closed.");
              return;
            }
            if (split.pages.length === 0) {
              onToast(`No pages found in ${file.name || "PDF"}`);
              setPdfNote(`No pages found in ${file.name || "PDF"}`);
              setPdfNoteIsError(true);
              continue;
            }
            const note = split.truncated
              ? `${file.name}: imported first ${split.pages.length} of ${split.totalPages} pages.`
              : `${file.name}: ${split.pages.length} page${
                  split.pages.length === 1 ? "" : "s"
                } ready for OCR.`;
            setPdfNote(note);
            setPdfNoteIsError(false);
            for (const page of split.pages) {
              if (remaining <= 0) break;
              nextItems.push({
                id: createId(),
                label: `${file.name || "PDF"} · p${page.pageNumber}`,
                file: page.file,
                previewUrl: page.objectUrl,
                status: "queued",
                form: {
                  ...EMPTY_LEAD_FORM,
                  interest: defaultInterest,
                  priority: defaultPriority,
                },
                expanded: false,
              });
              remaining -= 1;
            }
            // Show pages in the queue immediately while more files process.
            if (nextItems.length > 0) {
              const batch = nextItems.splice(0, nextItems.length);
              enqueued += batch.length;
              setItems((prev) => {
                const merged = [...prev, ...batch];
                itemsRef.current = merged;
                return merged;
              });
            }
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message
                : `Could not read PDF ${file.name || ""}`;
            console.error("[bulk-import] PDF failed", file.name, err);
            onToast(message);
            setPdfNote(message);
            setPdfNoteIsError(true);
          }
          continue;
        }

        if (!isImageFile(file)) {
          const label = file.name || file.type || "file";
          onToast(`Skipped unsupported file: ${label}`);
          setPdfNote(`Skipped unsupported file: ${label}`);
          setPdfNoteIsError(true);
          continue;
        }

        nextItems.push({
          id: createId(),
          label: file.name || "Image",
          file,
          previewUrl: URL.createObjectURL(file),
          status: "queued",
          form: {
            ...EMPTY_LEAD_FORM,
            interest: defaultInterest,
            priority: defaultPriority,
          },
          expanded: false,
        });
        remaining -= 1;
      }

      if (nextItems.length > 0) {
        enqueued += nextItems.length;
        setItems((prev) => {
          const merged = [...prev, ...nextItems];
          itemsRef.current = merged;
          return merged;
        });
      } else if (
        enqueued === 0 &&
        openRef.current &&
        session === abortRef.current
      ) {
        setPdfNote((prev) =>
          prev ?? "No usable images or PDF pages were added. Try again.",
        );
        setPdfNoteIsError(true);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not add selected files.";
      console.error("[bulk-import] addFiles failed", err);
      onToast(message);
      setPdfNote(message);
      setPdfNoteIsError(true);
    } finally {
      setLoadingFiles(false);
      setLoadingLabel("Preparing files…");
    }
  }

  function onImagesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    // CRITICAL: copy FileList before clearing value — FileList is live and
    // becomes empty when the input is reset (breaks image + PDF on some browsers).
    const files = snapshotFileList(e.target.files);
    e.target.value = "";
    if (files.length === 0) {
      onToast("No files received from the picker. Try again.");
      return;
    }
    void addFiles(files);
  }

  function onPdfPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = snapshotFileList(e.target.files);
    e.target.value = "";
    if (files.length === 0) {
      onToast("No PDF received from the picker. Try again.");
      return;
    }
    void addFiles(files);
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  }

  function findDuplicate(email: string, phone: string): Lead | null {
    const e = normalizeEmail(email);
    const p = normalizePhone(phone);
    if (!e && !p) return null;
    return (
      existingLeads.find((lead) => {
        if (e && normalizeEmail(lead.email) === e) return true;
        if (p && normalizePhone(lead.phone) === p) return true;
        return false;
      }) ?? null
    );
  }

  async function saveOne(
    itemId: string,
    options?: { skipDuplicateCheck?: boolean },
  ): Promise<boolean> {
    const item = itemsRef.current.find((i) => i.id === itemId);
    if (!item) return false;

    if (!canSaveForm(item.form)) {
      onToast("Fill name, company, interest, and priority before saving.");
      return false;
    }

    let createdAt: string;
    try {
      createdAt = qatarDayToCreatedAtIso(eventDate);
    } catch {
      onToast("Pick a valid event date.");
      return false;
    }

    if (!options?.skipDuplicateCheck) {
      const email = item.form.email.trim();
      const phone = item.form.phone.trim();
      let dup = findDuplicate(email, phone);
      if (!dup && (email || phone)) {
        dup = await api.findDuplicate({ email, phone });
      }
      if (dup) {
        const ok = window.confirm(
          `Possible duplicate of ${dup.name} (${dup.company}). Save anyway?`,
        );
        if (!ok) {
          patchItem(item.id, { status: "skipped" });
          return false;
        }
      }
    }

    patchItem(item.id, { status: "saving", error: undefined });
    const latest = itemsRef.current.find((i) => i.id === itemId) ?? item;
    const input: CreateLeadInput = {
      name: latest.form.name.trim(),
      company: latest.form.company.trim(),
      position: latest.form.position.trim() || null,
      phone: latest.form.phone.trim() || null,
      email: latest.form.email.trim() || null,
      interest: latest.form.interest as Interest,
      priority: latest.form.priority as Priority,
      owner: DEFAULT_OWNER,
      notes: buildLeadNotes(latest.form),
      business_card_image: null,
      created_at: createdAt,
    };

    try {
      let cardFile = latest.file;
      try {
        cardFile = await compressCardImageForUpload(cardFile);
      } catch {
        /* keep original */
      }
      const lead = await api.createLead(input, {
        cardFile,
        id: createId(),
      });
      onLeadSaved(lead);
      patchItem(item.id, { status: "saved", expanded: false });
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Save failed — try again.";
      patchItem(item.id, { status: "ready", error: message, expanded: true });
      onToast(message);
      return false;
    }
  }

  async function handleSaveAllReady() {
    const readyIds = itemsRef.current
      .filter(
        (i) =>
          (i.status === "ready" || i.status === "skipped") && canSaveForm(i.form),
      )
      .map((i) => i.id);
    if (readyIds.length === 0) {
      onToast("No cards ready to save — set interest/priority on each.");
      return;
    }
    setBatchSaving(true);
    let saved = 0;
    try {
      for (const id of readyIds) {
        const ok = await saveOne(id);
        if (ok) saved += 1;
      }
      onToast(
        saved > 0
          ? `Saved ${saved} lead${saved === 1 ? "" : "s"} for ${formatQatarDateLabel(eventDate)}`
          : "No leads saved",
      );
    } finally {
      setBatchSaving(false);
    }
  }

  if (!open) return null;

  const queued = items.filter((i) => i.status === "queued" || i.status === "extracting")
    .length;
  const readyCount = items.filter(
    (i) => i.status === "ready" && canSaveForm(i.form),
  ).length;
  const savedCount = items.filter((i) => i.status === "saved").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-[rgba(7,8,12,0.72)] p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden border border-[#1b2130] bg-[#0c0e14] text-slate-100 shadow-2xl sm:h-[min(92dvh,900px)] sm:rounded-[14px]">
        <div className="flex items-start justify-between gap-3 border-b border-[#161b27] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-[16px] font-semibold tracking-[-0.01em] text-slate-50"
            >
              Bulk import
            </h2>
            <p className="mt-0.5 text-[12.5px] text-[#8b93a7]">
              Upload many card photos or a PDF (one card per page). OCR runs in
              sequence, then you review and save with a booth date.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] border border-[#242a38] bg-[#11141d] text-slate-300"
            aria-label="Close bulk import"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="border-b border-[#161b27] px-4 py-3 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-[12px] font-medium text-[#a9b3c6]">
              Event / booth date
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="field-input-dark mt-1.5 w-full"
              />
              <span className="mt-1 block text-[11px] font-normal text-[#6b7488]">
                Default is yesterday ({formatQatarDateLabel(qatarYesterdayKey())}
                ). Leads are stamped noon Qatar time on this day.
              </span>
            </label>
            <label className="block text-[12px] font-medium text-[#a9b3c6]">
              Interest
              <SearchableSelect
                value={defaultInterest}
                onChange={(v) => setDefaultInterest(v as Interest | "")}
                aria-label="Interest"
                searchPlaceholder="Search interest…"
                options={[
                  { value: "", label: "Set per card" },
                  ...INTERESTS.map((v) => ({ value: v, label: v })),
                ]}
              />
            </label>
            <label className="block text-[12px] font-medium text-[#a9b3c6]">
              Priority
              <SearchableSelect
                value={defaultPriority}
                onChange={(v) => setDefaultPriority(v as Priority | "")}
                aria-label="Priority"
                searchPlaceholder="Search priority…"
                options={[
                  { value: "", label: "Set per card" },
                  ...PRIORITIES.map((v) => ({ value: v, label: v })),
                ]}
              />
            </label>
          </div>

          {!geminiConfigured ? (
            <p className="mt-3 rounded-[10px] border border-[rgba(240,54,155,0.35)] bg-[rgba(240,54,155,0.08)] px-3 py-2 text-[12.5px] text-pink-200">
              Gemini API key needed for OCR.{" "}
              <button
                type="button"
                className="font-semibold underline"
                onClick={onOpenAdmin}
              >
                Open Admin
              </button>
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loadingFiles || items.length >= MAX_BULK_ITEMS}
              onClick={() => imagesInputRef.current?.click()}
              className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[rgba(34,211,238,0.35)] bg-[rgba(34,211,238,0.1)] px-4 text-[13px] font-semibold text-slate-100 disabled:opacity-50"
            >
              <FileImage className="h-4 w-4 text-cyan-300" aria-hidden />
              Add images
            </button>
            <button
              type="button"
              disabled={loadingFiles || items.length >= MAX_BULK_ITEMS}
              onClick={() => pdfInputRef.current?.click()}
              className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-[rgba(139,92,246,0.4)] bg-[rgba(139,92,246,0.12)] px-4 text-[13px] font-semibold text-slate-100 disabled:opacity-50"
            >
              <FileText className="h-4 w-4 text-violet-300" aria-hidden />
              Add PDF
            </button>
            <button
              type="button"
              disabled={batchSaving || readyCount === 0}
              onClick={() => void handleSaveAllReady()}
              className="qes-gradient-btn inline-flex min-h-11 items-center gap-2 rounded-[10px] px-4 text-[13px] font-bold disabled:opacity-50"
            >
              {batchSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-4 w-4" aria-hidden />
              )}
              Save ready ({readyCount})
            </button>
          </div>

          <p className="qes-mono mt-2 text-[10.5px] tracking-[0.08em] text-[#6b7488]">
            {items.length} in queue · {queued} extracting · {savedCount} saved ·
            max {MAX_BULK_ITEMS} cards · PDF ≤ {MAX_PDF_PAGES} pages
          </p>
          {pdfNote ? (
            <p
              className={`mt-1 text-[12px] ${
                pdfNoteIsError ? "text-pink-300" : "text-amber-200/90"
              }`}
              role={pdfNoteIsError ? "alert" : "status"}
            >
              {pdfNote}
            </p>
          ) : null}
          {loadingFiles ? (
            <p className="mt-1 flex items-center gap-2 text-[12.5px] text-cyan-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {loadingLabel}
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
              {loadingFiles ? (
                <>
                  <Loader2
                    className="h-8 w-8 animate-spin text-cyan-300"
                    aria-hidden
                  />
                  <p className="text-[14px] text-cyan-200/90">{loadingLabel}</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-[#6b7488]" aria-hidden />
                  <p className="text-[14px] text-[#8b93a7]">
                    Add card photos and/or a multi-page PDF to start OCR.
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="overflow-hidden rounded-[12px] border border-[#1b2130] bg-[#0d1017]"
                >
                  <div className="flex gap-3 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="h-20 w-[7.5rem] shrink-0 rounded-lg border border-[#202634] object-contain bg-[#080a0f]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-slate-100">
                            {item.form.name.trim() || item.label}
                          </p>
                          <p className="truncate text-[12px] text-[#8b93a7]">
                            {item.form.company.trim() || item.label}
                          </p>
                          <StatusChip status={item.status} />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            className="rounded-lg border border-[#242a38] bg-[#11141d] px-2.5 py-1.5 text-[12px] font-medium text-slate-300"
                            onClick={() =>
                              patchItem(item.id, {
                                expanded: !item.expanded,
                              })
                            }
                          >
                            {item.expanded ? "Hide" : "Edit"}
                          </button>
                          {item.status === "ready" ||
                          item.status === "skipped" ||
                          item.status === "error" ? (
                            <button
                              type="button"
                              disabled={batchSaving || !canSaveForm(item.form)}
                              className="rounded-lg border border-[rgba(34,211,238,0.35)] bg-[rgba(34,211,238,0.1)] px-2.5 py-1.5 text-[12px] font-semibold text-cyan-100 disabled:opacity-40"
                              onClick={() => void saveOne(item.id)}
                            >
                              Save lead
                            </button>
                          ) : null}
                          {item.status !== "saving" &&
                          item.status !== "extracting" ? (
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg border border-[#242a38] bg-[#11141d] px-2 py-1.5 text-slate-400"
                              aria-label={`Remove ${item.label}`}
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {item.error ? (
                        <p className="mt-1.5 text-[12px] text-pink-300">
                          {item.error}
                        </p>
                      ) : null}
                      {item.status === "saved" ? (
                        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                          Saved for {formatQatarDateLabel(eventDate)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {item.expanded &&
                  item.status !== "extracting" &&
                  item.status !== "queued" ? (
                    <div className="border-t border-[#161b27] px-3 py-3">
                      <LeadForm
                        values={item.form}
                        onChange={(form) => patchItem(item.id, { form })}
                        onSubmit={() => void saveOne(item.id)}
                        submitLabel="Save Lead"
                        busy={item.status === "saving" || batchSaving}
                        disabled={item.status === "saved"}
                        variant="dark"
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Keep inputs outside overflow-hidden card; opacity-0 + size for mobile pickers */}
      <input
        ref={imagesInputRef}
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
        multiple
        className="fixed left-0 top-0 h-px w-px opacity-0"
        aria-label="Upload business card images"
        tabIndex={-1}
        onChange={onImagesPicked}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="fixed left-0 top-0 h-px w-px opacity-0"
        aria-label="Upload PDF of business cards"
        tabIndex={-1}
        onChange={onPdfPicked}
      />
    </div>
  );
}

function StatusChip({ status }: { status: ItemStatus }) {
  const map: Record<ItemStatus, { label: string; className: string }> = {
    queued: {
      label: "Queued",
      className: "text-[#8b93a7]",
    },
    extracting: {
      label: "Extracting…",
      className: "text-cyan-300",
    },
    ready: {
      label: "Ready",
      className: "text-emerald-300",
    },
    error: {
      label: "Needs review",
      className: "text-pink-300",
    },
    saving: {
      label: "Saving…",
      className: "text-cyan-300",
    },
    saved: {
      label: "Saved",
      className: "text-emerald-300",
    },
    skipped: {
      label: "Skipped duplicate",
      className: "text-amber-200",
    },
  };
  const entry = map[status];
  return (
    <span
      className={`qes-mono mt-1 inline-flex items-center gap-1.5 text-[10px] tracking-[0.12em] uppercase ${entry.className}`}
    >
      {(status === "extracting" || status === "saving") && (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      )}
      {entry.label}
    </span>
  );
}
