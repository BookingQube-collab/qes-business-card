/** Client-only PDF → JPEG page images for bulk card import. */

export const MAX_PDF_PAGES = 40;
export const MAX_BULK_ITEMS = 60;

export type PdfPageImage = {
  file: File;
  pageNumber: number;
  objectUrl: string;
};

let workerReady = false;

async function ensurePdfjs() {
  const pdfjs = await import("pdfjs-dist");
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    workerReady = true;
  }
  return pdfjs;
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
  options?: { maxPages?: number; onProgress?: (done: number, total: number) => void },
): Promise<PdfSplitResult> {
  const maxPages = options?.maxPages ?? MAX_PDF_PAGES;
  const pdfjs = await ensurePdfjs();
  const data = new Uint8Array(await pdfFile.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const totalPages = doc.numPages;
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
      const ctx = canvas.getContext("2d");
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
