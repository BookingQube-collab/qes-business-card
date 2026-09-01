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

/** Request continuous autofocus when the device supports it. */
export async function applyCameraFocus(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track?.applyConstraints) return;

  const caps = track.getCapabilities?.() as MediaTrackCapabilities & {
    focusMode?: string[];
  };
  if (!caps?.focusMode?.includes("continuous")) return;

  try {
    await track.applyConstraints({
      advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
    });
  } catch {
    /* unsupported on this browser/device */
  }
}

/** Mild contrast lift to help OCR on booth lighting / color casts. */
export function enhanceCanvasForOcr(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const contrast = 1.14;
  const brightness = 8;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c += 1) {
      const v = (data[i + c] - 128) * contrast + 128 + brightness;
      data[i + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Capture from the live camera stream. Uses ImageCapture when available for
 * full sensor resolution, otherwise draws the current video frame.
 */
export async function captureFromCamera(
  video: HTMLVideoElement,
  stream: MediaStream | null,
  filenameBase = "business-card",
): Promise<File> {
  const track = stream?.getVideoTracks()[0];
  if (track && typeof ImageCapture !== "undefined") {
    try {
      const capture = new ImageCapture(track);
      const blob = await capture.takePhoto();
      if (blob.size > 0) {
        const ext = blob.type.includes("jpeg") ? "jpg" : "webp";
        return new File([blob], `${filenameBase}.${ext}`, {
          type: blob.type || "image/jpeg",
          lastModified: Date.now(),
        });
      }
    } catch {
      /* fall back to canvas frame grab */
    }
  }

  return captureVideoFrame(video, filenameBase);
}

/**
 * Draw the current video frame to a canvas and return a high-quality JPEG.
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

  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.88);
  if (jpeg && jpeg.size > 0) {
    return new File([jpeg], `${filenameBase}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  }

  const webp = await canvasToBlob(canvas, "image/webp", 0.88);
  if (webp && webp.size > 0) {
    return new File([webp], `${filenameBase}.webp`, {
      type: "image/webp",
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
