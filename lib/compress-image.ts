/**
 * Client-side image compression for booth uploads.
 * Max edge 1600px, prefer WebP ~0.78, JPEG fallback for Safari gaps.
 */
export async function compressCardImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
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

  const webp = await canvasToBlob(canvas, "image/webp", 0.78);
  if (webp && webp.size > 0) {
    return new File([webp], replaceExt(file.name, "webp"), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  }

  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.82);
  if (jpeg && jpeg.size > 0) {
    return new File([jpeg], replaceExt(file.name, "jpg"), {
      type: "image/jpeg",
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
