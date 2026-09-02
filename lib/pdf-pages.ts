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
let workerMode: "local" | "cdn" | null = null;

function cdnWorkerSrc(version: string): string {
  return `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}

function configureWorker(pdfjs: PdfjsModule, mode: "local" | "cdn") {
  pdfjs.GlobalWorkerOptions.workerSrc =
    mode === "local" ? "/pdf.worker.min.mjs" : cdnWorkerSrc(pdfjs.version);
  workerMode = mode;
}

async function ensurePdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist")
      .then((pdfjs) => {
        // Prefer same-origin public asset (copied by scripts/copy-pdf-worker.mjs).
        // Do NOT use `new URL("pdfjs-dist/...", import.meta.url)` — Next/Turbopack
        // often leaves that unresolved, so the worker 404s on Vercel and PDF import
        // silently fails after a cryptic worker error.
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
  return /worker|Setting up fake worker|Failed to fetch|dynamically imported module|Loading failed/i.test(
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
  const data = new Uint8Array(await pdfFile.arrayBuffer());

  let doc: Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>;
  try {
    doc = await pdfjs.getDocument({ data }).promise;
  } catch (err) {
    // Local worker 404 / MIME issues → one retry via version-pinned CDN.
    if (workerMode === "local" && isWorkerLoadError(err)) {
      configureWorker(pdfjs, "cdn");
      try {
        doc = await pdfjs.getDocument({ data }).promise;
      } catch (retryErr) {
        throw mapPdfError(retryErr, pdfFile.name);
      }
    } else {
      throw mapPdfError(err, pdfFile.name);
    }
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
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
}
