"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/qes/AppHeader";
import { AuthGate } from "@/components/qes/AuthGate";
import {
  CaptureView,
  type CaptureStep,
} from "@/components/qes/CaptureView";
import {
  EMPTY_LEAD_FORM,
  type LeadFormValues,
} from "@/components/qes/LeadForm";
import {
  LeadDetailsSheet,
  leadToFormValues,
} from "@/components/qes/LeadDetailsSheet";
import { DuplicateDialog } from "@/components/qes/DuplicateDialog";
import { LeadReport } from "@/components/qes/LeadReport";
import { Toast } from "@/components/qes/Toast";
import {
  AdminPanel,
  type GeminiKeyStatus,
} from "@/components/qes/AdminPanel";
import { DEFAULT_FILTERS } from "@/lib/constants";
import {
  clearCaptureDraft,
  saveCaptureDraft,
} from "@/lib/capture-draft";
import { compressCardImage } from "@/lib/compress-image";
import { getLeadApi, LeadApiError } from "@/lib/leads-api";
import { computeStats, createId, filterLeads } from "@/lib/lead-utils";
import { createClient } from "@/lib/supabase/client";
import { setRuntimeSupabaseConfig } from "@/lib/supabase/env";
import type {
  CreateLeadInput,
  Interest,
  Lead,
  LeadFilters,
  Owner,
  Priority,
} from "@/types/lead";
import type { ExtractedBusinessCard } from "@/types/ocr";

type AppView = "capture" | "report";

type QesAppProps = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  initialAuthed?: boolean;
};

export function QesApp({
  supabaseUrl = "",
  supabaseAnonKey = "",
  initialAuthed = false,
}: QesAppProps) {
  setRuntimeSupabaseConfig(supabaseUrl, supabaseAnonKey);
  const api = useMemo(() => getLeadApi(), []);
  const useSupabase = Boolean(supabaseUrl && supabaseAnonKey);

  const [authReady, setAuthReady] = useState(true);
  const [authed, setAuthed] = useState(initialAuthed);

  const [view, setView] = useState<AppView>("capture");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [ready, setReady] = useState(false);

  const [step, setStep] = useState<CaptureStep>("pick");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const imageUrlRef = useRef<string | null>(null);
  const cardFileRef = useRef<File | null>(null);
  const [formValues, setFormValues] = useState<LeadFormValues>(EMPTY_LEAD_FORM);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState<LeadFilters>({ ...DEFAULT_FILTERS });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] =
    useState<LeadFormValues>(EMPTY_LEAD_FORM);
  const [signedCardUrl, setSignedCardUrl] = useState<string | null>(null);

  const [duplicate, setDuplicate] = useState<Lead | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<GeminiKeyStatus | null>(
    null,
  );
  const readAbortRef = useRef(0);
  const compressPromiseRef = useRef<Promise<File> | null>(null);
  const [scanDurationsMs, setScanDurationsMs] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (useSupabase) {
          const supabase = createClient();
          const { data } = await supabase.auth.getSession();
          if (!cancelled) setAuthed(Boolean(data.session));
        } else {
          const res = await fetch("/api/auth/session", {
            credentials: "include",
          });
          const json = (await res.json()) as { authed?: boolean };
          if (!cancelled) setAuthed(Boolean(json.authed));
        }
      } catch {
        if (!cancelled) setAuthed(false);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useSupabase]);

  useEffect(() => {
    clearCaptureDraft();
  }, []);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    fetch("/api/admin/gemini", { credentials: "include" })
      .then((res) => res.json())
      .then((json: GeminiKeyStatus & { error?: string }) => {
        if (cancelled || typeof json.configured !== "boolean") return;
        setGeminiStatus(json);
      })
      .catch(() => {
        /* status badge stays unknown */
      });
    return () => {
      cancelled = true;
    };
  }, [authed]);

  const reloadLeads = useCallback(async () => {
    try {
      const data = await api.getLeads();
      setLeads(data);
      setReady(true);
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not load leads";
      if (/unauthorized|not signed in/i.test(message)) {
        setAuthed(false);
        setReady(false);
        setLeads([]);
        setToast("Please sign in again");
        return [];
      }
      setToast(message);
      setReady(true);
      return [];
    }
  }, [api]);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getLeads();
        if (cancelled) return;
        setLeads(data);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Could not load leads";
        if (/unauthorized|not signed in/i.test(message)) {
          setAuthed(false);
          setReady(false);
          setLeads([]);
          setToast("Please sign in again");
          return;
        }
        setToast(message);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, authed]);

  useEffect(() => {
    if (!authed || view !== "report") return;
    const timer = window.setInterval(() => {
      void reloadLeads();
    }, 15000);
    function onFocus() {
      void reloadLeads();
    }
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [authed, view, reloadLeads]);

  useEffect(() => {
    if (step === "form") {
      saveCaptureDraft({ formValues, step });
    }
  }, [formValues, step]);

  const revokeImage = useCallback(() => {
    if (imageUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(imageUrlRef.current);
    }
    imageUrlRef.current = null;
    setImageUrl(null);
    cardFileRef.current = null;
    compressPromiseRef.current = null;
  }, []);

  const resetCapture = useCallback(() => {
    readAbortRef.current += 1;
    compressPromiseRef.current = null;
    revokeImage();
    setFormValues(EMPTY_LEAD_FORM);
    setStep("pick");
    setSaving(false);
    setOcrError(null);
    setDuplicate(null);
    clearCaptureDraft();
  }, [revokeImage]);

  const stats = useMemo(() => computeStats(leads), [leads]);
  const avgScanMs = useMemo(() => {
    if (scanDurationsMs.length === 0) return null;
    const sum = scanDurationsMs.reduce((acc, ms) => acc + ms, 0);
    return Math.round(sum / scanDurationsMs.length);
  }, [scanDurationsMs]);
  const filteredLeads = useMemo(
    () => filterLeads(leads, filters),
    [leads, filters],
  );

  async function handleImageSelected(file: File, objectUrl: string) {
    if (imageUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(imageUrlRef.current);
    }
    // Show preview immediately so shutter/upload never flashes back to idle
    // while compression runs.
    imageUrlRef.current = objectUrl;
    cardFileRef.current = file;
    setImageUrl(objectUrl);
    setStep("preview");
    setOcrError(null);

    compressPromiseRef.current = compressCardImage(file)
      .then((compressed) => {
        if (imageUrlRef.current !== objectUrl) return file;
        const url = URL.createObjectURL(compressed);
        URL.revokeObjectURL(objectUrl);
        imageUrlRef.current = url;
        cardFileRef.current = compressed;
        setImageUrl(url);
        return compressed;
      })
      .catch(() => file);

    void compressPromiseRef.current;
  }

  function handleRetake() {
    revokeImage();
    setOcrError(null);
    setStep("pick");
  }

  function handleRemove() {
    revokeImage();
    setOcrError(null);
    setStep("pick");
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
      /* non-JSON body */
    }
    if (json.demo) {
      throw new Error(
        "Set a Gemini API key in Admin before scanning cards.",
      );
    }
    if (!res.ok || !json.extracted) {
      throw new Error(
        json.error ||
          "We could not read this card clearly. Please try another photo or enter details manually.",
      );
    }
    return json.extracted;
  }

  async function handleReadCard() {
    const token = ++readAbortRef.current;
    setStep("reading");
    setOcrError(null);
    const scanStart = performance.now();

    try {
      const pending = compressPromiseRef.current;
      const file = pending ? await pending : cardFileRef.current;
      if (!file) {
        throw new Error("Capture or upload a business card first.");
      }
      cardFileRef.current = file;

      const extracted = await extractViaApi(file);

      if (token !== readAbortRef.current) return;

      setScanDurationsMs((prev) => [
        ...prev,
        Math.round(performance.now() - scanStart),
      ]);

      setFormValues({
        ...EMPTY_LEAD_FORM,
        name: extracted.name ?? "",
        company: extracted.company ?? "",
        position: extracted.position ?? "",
        phone: extracted.phone ?? "",
        email: extracted.email ?? "",
        interest: "",
        priority: "",
        owner: "",
        notes: "",
      });
      setStep("form");
    } catch (err) {
      if (token !== readAbortRef.current) return;
      const message =
        err instanceof Error
          ? err.message
          : "We could not read this card clearly. Please try another photo or enter details manually.";
      setOcrError(message);
      setToast(message);
      setFormValues({ ...EMPTY_LEAD_FORM });
      setStep("form");
      if (/gemini api key|admin/i.test(message)) {
        setAdminOpen(true);
      }
    }
  }

  async function persistLead() {
    if (
      !formValues.name.trim() ||
      !formValues.company.trim() ||
      !formValues.interest ||
      !formValues.priority ||
      !formValues.owner
    ) {
      setToast("Please complete required fields");
      return;
    }

    setSaving(true);
    const input: CreateLeadInput = {
      name: formValues.name.trim(),
      company: formValues.company.trim(),
      position: formValues.position.trim() || null,
      phone: formValues.phone.trim() || null,
      email: formValues.email.trim() || null,
      interest: formValues.interest as Interest,
      priority: formValues.priority as Priority,
      owner: formValues.owner as Owner,
      notes: formValues.notes.trim() || null,
      business_card_image: null,
    };

    try {
      await api.createLead(input, {
        cardFile: cardFileRef.current,
        id: createId(),
      });
      await reloadLeads();
      setToast("Business card saved");
      imageUrlRef.current = null;
      cardFileRef.current = null;
      setImageUrl(null);
      setFormValues(EMPTY_LEAD_FORM);
      setStep("pick");
      setDuplicate(null);
      clearCaptureDraft();
    } catch (err) {
      console.error(err);
      setToast(
        err instanceof Error
          ? err.message
          : "Save failed — your form is preserved. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLead() {
    if (saving) return;
    try {
      const dup = await api.findDuplicate({
        email: formValues.email,
        phone: formValues.phone,
      });
      if (dup) {
        setDuplicate(dup);
        return;
      }
      await persistLead();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "";
      const status = err instanceof LeadApiError ? err.status : 0;

      if (status === 401 || /unauthorized/i.test(message)) {
        setAuthed(false);
        setToast("Please sign in again");
        return;
      }
      if (status === 503 || /not configured/i.test(message)) {
        setToast(
          message ||
            "Leads storage is not configured on the server. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
        );
        return;
      }

      setToast("Could not verify duplicates — saving anyway");
      await persistLead();
    }
  }

  async function openLead(lead: Lead) {
    setSelectedLead(lead);
    setEditValues(leadToFormValues(lead));
    setEditing(false);
    setSheetOpen(true);
    setSignedCardUrl(null);
    try {
      const url = await api.getSignedCardUrl(lead.business_card_image);
      setSignedCardUrl(url);
    } catch {
      setSignedCardUrl(null);
    }
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditing(false);
    setSelectedLead(null);
    setSignedCardUrl(null);
  }

  async function handleSaveEdit() {
    if (!selectedLead || saving) return;
    if (
      !editValues.name.trim() ||
      !editValues.company.trim() ||
      !editValues.interest ||
      !editValues.priority ||
      !editValues.owner
    ) {
      return;
    }

    setSaving(true);
    try {
      const updated = await api.updateLead(selectedLead.id, {
        name: editValues.name.trim(),
        company: editValues.company.trim(),
        position: editValues.position.trim() || null,
        phone: editValues.phone.trim() || null,
        email: editValues.email.trim() || null,
        interest: editValues.interest as Interest,
        priority: editValues.priority as Priority,
        owner: editValues.owner as Owner,
        notes: editValues.notes.trim() || null,
      });
      await reloadLeads();
      setSelectedLead(updated);
      setEditing(false);
      setToast("Business card saved");
    } catch (err) {
      console.error(err);
      setToast(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (useSupabase) {
        await createClient().auth.signOut();
      }
    } catch {
      // still clear local session
    }
    setAdminOpen(false);
    setGeminiStatus(null);
    setAuthed(false);
    setLeads([]);
    setReady(false);
    resetCapture();
  }

  const handleGeminiStatus = useCallback((status: GeminiKeyStatus) => {
    setGeminiStatus(status);
  }, []);
  const closeAdmin = useCallback(() => setAdminOpen(false), []);

  const dismissToast = useCallback(() => setToast(null), []);

  if (!authReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0b0c11] text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  if (!authed) {
    return (
      <AuthGate
        useSupabase={useSupabase}
        onAuthed={() => {
          setAuthed(true);
          setReady(false);
        }}
      />
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0b0c11] text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-dvh flex-col ${
        view === "capture"
          ? "bg-[#07080c] text-white"
          : "bg-[#f6f7fa] text-[#0f172a]"
      }`}
    >
      <AppHeader
        view={view}
        leadCount={stats.total}
        geminiConfigured={geminiStatus?.configured ?? true}
        onShowReport={() => {
          resetCapture();
          setView("report");
          void reloadLeads();
        }}
        onShowCapture={() => {
          closeSheet();
          setView("capture");
        }}
        onOpenAdmin={() => setAdminOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-[env(safe-area-inset-bottom)]">
        {view === "capture" ? (
          <CaptureView
            stats={stats}
            avgScanMs={avgScanMs}
            step={step}
            imageUrl={imageUrl}
            formValues={formValues}
            ocrError={ocrError}
            onImageSelected={handleImageSelected}
            onRetake={handleRetake}
            onRemove={handleRemove}
            onReadCard={handleReadCard}
            onFormChange={setFormValues}
            onSave={handleSaveLead}
            saving={saving}
          />
        ) : (
          <LeadReport
            stats={stats}
            leads={filteredLeads}
            totalCount={leads.length}
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={() => setFilters({ ...DEFAULT_FILTERS })}
            onSelectLead={openLead}
            onAddCard={() => {
              closeSheet();
              resetCapture();
              setView("capture");
            }}
          />
        )}
      </main>

      {ocrError && step === "form" ? (
        <p className="sr-only" role="status">
          {ocrError}
        </p>
      ) : null}

      <LeadDetailsSheet
        lead={selectedLead}
        open={sheetOpen}
        editing={editing}
        editValues={editValues}
        signedImageUrl={signedCardUrl}
        onEditValuesChange={setEditValues}
        onClose={closeSheet}
        onStartEdit={() => {
          if (selectedLead) {
            setEditValues(leadToFormValues(selectedLead));
            setEditing(true);
          }
        }}
        onCancelEdit={() => {
          if (selectedLead) {
            setEditValues(leadToFormValues(selectedLead));
          }
          setEditing(false);
        }}
        onSaveEdit={handleSaveEdit}
        saving={saving}
      />

      {duplicate ? (
        <DuplicateDialog
          lead={duplicate}
          saving={saving}
          onCancel={() => setDuplicate(null)}
          onViewExisting={() => {
            const lead = duplicate;
            setDuplicate(null);
            setView("report");
            void openLead(lead);
          }}
          onSaveAnyway={() => {
            void persistLead();
          }}
        />
      ) : null}

      <Toast message={toast} onDismiss={dismissToast} />

      {adminOpen ? (
        <AdminPanel
          open
          onClose={closeAdmin}
          onStatus={handleGeminiStatus}
        />
      ) : null}
    </div>
  );
}
