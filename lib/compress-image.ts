import { enhanceCanvasForOcr } from "@/lib/capture-frame";

/**
 * Client-side image compression for booth uploads.
 * Max edge 1920px, JPEG ~0.85 — fast upload with readable text.
 */
export async function compressCardImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 1920;
  const maxDim = Math.max(bitmap.width, bitmap.height);
  const skipReencode =
    maxDim <= maxEdge &&
    file.size <= 1.2 * 1024 * 1024 &&
    (file.type === "image/jpeg" || file.type === "image/webp");

  if (skipReencode) {
    bitmap.close();
    return file;
  }

  const scale = Math.min(1, maxEdge / maxDim);
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
  enhanceCanvasForOcr(ctx, width, height);

  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.85);
  if (jpeg && jpeg.size > 0) {
    return new File([jpeg], replaceExt(file.name, "jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  }

  const webp = await canvasToBlob(canvas, "image/webp", 0.85);
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
