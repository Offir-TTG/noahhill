/**
 * Shrink an image in the browser before it is uploaded.
 *
 * A phone photo is routinely 2 to 5 MB and several thousand pixels wide, far
 * beyond anything the site displays. Re-encoding before upload cuts storage,
 * upload time and the bytes visitors download, and it happens once rather than
 * on every page view.
 *
 * Runs client-side only: it needs canvas.
 */

export type CompressOptions = {
  /** Longest edge in pixels. Anything smaller is left at its own size. */
  maxDimension?: number;
  /** JPEG quality, 0 to 1. */
  quality?: number;
  /** Skip files already smaller than this. */
  skipUnderBytes?: number;
};

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 2000,
  quality: 0.82,
  skipUnderBytes: 300 * 1024,
};

export type CompressResult = {
  file: File;
  originalBytes: number;
  bytes: number;
  /** False when the original was returned untouched. */
  changed: boolean;
};

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<CompressResult> {
  const { maxDimension, quality, skipUnderBytes } = { ...DEFAULTS, ...options };
  const untouched: CompressResult = {
    file, originalBytes: file.size, bytes: file.size, changed: false,
  };

  // Vectors lose their point when rasterised, and small files are not worth it.
  if (file.type === "image/svg+xml") return untouched;
  if (file.size <= skipUnderBytes) return untouched;

  try {
    // imageOrientation keeps EXIF rotation, which canvas would otherwise drop
    // and leave portrait photos lying on their side.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return untouched;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return untouched;

    // Re-encoding can grow an already well-compressed file; keep the smaller.
    if (blob.size >= file.size) return untouched;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return {
      file: new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }),
      originalBytes: file.size,
      bytes: blob.size,
      changed: true,
    };
  } catch {
    // A format the browser cannot decode (HEIC on Chrome, for instance) lands
    // here. Uploading the original is better than failing the save outright.
    return untouched;
  }
}

/** "2.7 MB" */
export function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}
