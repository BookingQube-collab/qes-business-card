/** Client-only PDF → JPEG page images for bulk card import. */

export const MAX_PDF_PAGES = 40;
export const MAX_BULK_ITEMS = 60;

export type PdfPageImage = {
  file: File;
  pageNumber: number;
  objectUrl: string;
};

type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfjsModule> | null = null;
let workerMode: "local" | "cdn-unpkg" | "cdn-jsdelivr" | null = null;

const WORKER_PATH = "/pdf.worker.min.mjs";

function cdnWorkerSrc(
  version: string,
  host: "unpkg" | "jsdelivr",
): string {
  if (host === "jsdelivr") {
    return `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }
  return `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}

function configureWorker(
  pdfjs: PdfjsModule,
  mode: "local" | "cdn-unpkg" | "cdn-jsdelivr",
) {
  if (mode === "local") {
    pdfjs.GlobalWorkerOptions.workerSrc = WORKER_PATH;
  } else if (mode === "cdn-unpkg") {
    pdfjs.GlobalWorkerOptions.workerSrc = cdnWorkerSrc(pdfjs.version, "unpkg");
  } else {
    pdfjs.GlobalWorkerOptions.workerSrc = cdnWorkerSrc(
      pdfjs.version,
      "jsdelivr",
    );
  }
  workerMode = mode;
}

async function ensurePdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist")
      .then((pdfjs) => {
        // Prefer same-origin public asset (copied by scripts/copy-pdf-worker.mjs).
        // Do NOT use `new URL("pdfjs-dist/...", import.meta.url)` — Next/Turbopack
        // often leaves that unresolved, so the worker 404s on Vercel.
        if (!workerMode) {
          configureWorker(pdfjs, "local");
        }
        return pdfjs;
      })
      .catch((err) => {
        pdfjsPromise = null;
        const detail = err instanceof Error ? err.message : String(err);
        throw new Error(
          `Could not load PDF engine. Refresh and try again. (${detail})`,
        );
      });
  }
  return pdfjsPromise;
}

function isWorkerLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /worker|Setting up fake worker|Failed to fetch|dynamically imported module|Loading failed|detached|ArrayBuffer/i.test(
    msg,
  );
}

function mapPdfError(err: unknown, fileName: string): Error {
  if (err instanceof Error && err.message.startsWith("Could not load PDF engine")) {
    return err;
  }
  const raw = err instanceof Error ? err.message : String(err);
  if (isWorkerLoadError(err)) {
    return new Error(
      `PDF worker failed to load for ${fileName}. Refresh the page, or upload card images instead.`,
    );
  }
  if (/password|encrypted/i.test(raw)) {
    return new Error(`PDF is password-protected: ${fileName}`);
  }
  if (/Invalid PDF|Missing PDF|corrupt|FormatError|Unexpected|bad xref/i.test(raw)) {
    return new Error(`Corrupt or invalid PDF: ${fileName}`);
  }
  if (/Could not render PDF page|Could not encode PDF page/i.test(raw)) {
    return new Error(`${raw} (${fileName})`);
  }
  return new Error(`Could not read PDF ${fileName}: ${raw}`);
}

async function openPdfDocument(
  pdfjs: PdfjsModule,
  bytes: ArrayBuffer,
): Promise<Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>> {
  // Always copy — getDocument may transfer/detach the TypedArray to the worker.
  const data = new Uint8Array(bytes.slice(0));
  return pdfjs.getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;
}

const WORKER_FALLBACKS: Array<"local" | "cdn-unpkg" | "cdn-jsdelivr"> = [
  "local",
  "cdn-unpkg",
  "cdn-jsdelivr",
];

export type PdfSplitResult = {
  pages: PdfPageImage[];
  totalPages: number;
  truncated: boolean;
};

/**
 * Render each PDF page to a JPEG File (one card per page assumed).
 * Caps at {@link MAX_PDF_PAGES}.
 */
export async function pdfFileToPageImages(
  pdfFile: File,
  options?: {
    maxPages?: number;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<PdfSplitResult> {
  if (typeof document === "undefined") {
    throw new Error("PDF import only runs in the browser.");
  }

  const maxPages = options?.maxPages ?? MAX_PDF_PAGES;
  const pdfjs = await ensurePdfjs();
  const bytes = await pdfFile.arrayBuffer();

  let doc: Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]> | null =
    null;
  let lastError: unknown = null;

  const modes = workerMode
    ? [
        workerMode,
        ...WORKER_FALLBACKS.filter((m) => m !== workerMode),
      ]
    : WORKER_FALLBACKS;

  for (const mode of modes) {
    try {
      configureWorker(pdfjs, mode);
      doc = await openPdfDocument(pdfjs, bytes);
      break;
    } catch (err) {
      lastError = err;
      doc = null;
      if (!isWorkerLoadError(err) && mode === modes[0]) {
        // Non-worker error on first attempt — still try other workers once,
        // then map the original error if all fail.
      }
    }
  }

  if (!doc) {
    throw mapPdfError(lastError, pdfFile.name);
  }

  const totalPages = doc.numPages;
  if (!totalPages || totalPages < 1) {
    await doc.destroy();
    throw new Error(`No pages found in ${pdfFile.name}`);
  }

  const renderCount = Math.min(totalPages, maxPages);
  const pages: PdfPageImage[] = [];
  const baseName = pdfFile.name.replace(/\.pdf$/i, "") || "card";

  try {
    for (let pageNumber = 1; pageNumber <= renderCount; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      // Target ~1600px on the long edge for OCR quality without huge uploads.
      const scale = Math.min(2.2, 1600 / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) {
        throw new Error("Could not render PDF page");
      }
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
      });
      if (!blob) {
        throw new Error(`Could not encode PDF page ${pageNumber}`);
      }
      const file = new File([blob], `${baseName}-p${pageNumber}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      pages.push({
        file,
        pageNumber,
        objectUrl: URL.createObjectURL(file),
      });
      options?.onProgress?.(pageNumber, renderCount);
    }
  } catch (err) {
    for (const page of pages) {
      if (page.objectUrl.startsWith("blob:")) {
        URL.revokeObjectURL(page.objectUrl);
      }
    }
    throw mapPdfError(err, pdfFile.name);
  } finally {
    await doc.destroy();
  }

  return {
    pages,
    totalPages,
    truncated: totalPages > renderCount,
  };
}

export function isPdfFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return (
    type === "application/pdf" ||
    type === "application/x-pdf" ||
    name.endsWith(".pdf")
  );
}

export function isImageFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || "");
}

/** Snapshot files before resetting the input — FileList is live and clears with value. */
export function snapshotFileList(
  list: FileList | File[] | null | undefined,
): File[] {
  if (!list || list.length === 0) return [];
  return Array.from(list);
}
