/** Lightweight helpers for getUserMedia booth capture (iPad Safari first). */

export function supportsGetUserMedia(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Draw the current video frame to a canvas and return a File (webp preferred, jpeg fallback).
 */
export async function captureVideoFrame(
  video: HTMLVideoElement,
  filenameBase = "business-card",
): Promise<File> {
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas unavailable");
  }
  ctx.drawImage(video, 0, 0, width, height);

  const webp = await canvasToBlob(canvas, "image/webp", 0.92);
  if (webp && webp.size > 0) {
    return new File([webp], `${filenameBase}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  }

  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.92);
  if (jpeg && jpeg.size > 0) {
    return new File([jpeg], `${filenameBase}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  }

  throw new Error("Could not encode capture");
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
