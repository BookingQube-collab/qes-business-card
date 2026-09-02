import { enhanceCanvasForOcr } from "@/lib/capture-frame";

type CompressOptions = {
  maxEdge: number;
  quality: number;
  skipBytes: number;
  /** OCR contrast pass — skip for archive/upload (faster, smaller). */
  enhanceForOcr?: boolean;
};

/**
 * Client-side image compression for booth OCR.
 * Max edge 2400px, JPEG ~0.92 — keeps small email/phone text readable.
 */
export async function compressCardImage(file: File): Promise<File> {
  return compressWithOptions(file, {
    maxEdge: 2400,
    quality: 0.92,
    skipBytes: 800 * 1024,
    enhanceForOcr: true,
  });
}

/**
 * Smaller JPEG/WebP for lead save upload — archive quality, faster network.
 * No OCR enhance pass (already extracted by save time).
 */
export async function compressCardImageForUpload(file: File): Promise<File> {
  return compressWithOptions(file, {
    maxEdge: 1600,
    quality: 0.72,
    skipBytes: 280 * 1024,
    enhanceForOcr: false,
  });
}

async function compressWithOptions(
  file: File,
  options: CompressOptions,
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxDim = Math.max(bitmap.width, bitmap.height);
  const skipReencode =
    maxDim <= options.maxEdge &&
    file.size <= options.skipBytes &&
    (file.type === "image/jpeg" || file.type === "image/webp");

  if (skipReencode) {
    bitmap.close();
    return file;
  }

  const scale = Math.min(1, options.maxEdge / maxDim);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  if (options.enhanceForOcr) {
    enhanceCanvasForOcr(ctx, width, height);
  }

  const jpeg = await canvasToBlob(canvas, "image/jpeg", options.quality);
  if (jpeg && jpeg.size > 0) {
    return new File([jpeg], replaceExt(file.name, "jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  }

  const webp = await canvasToBlob(canvas, "image/webp", options.quality);
  if (webp && webp.size > 0) {
    return new File([webp], replaceExt(file.name, "webp"), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  }

  return file;
}

function replaceExt(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "card";
  return `${base}.${ext}`;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    } catch {
      resolve(null);
    }
  });
}

export async function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}
