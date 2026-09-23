/**
 * Visuals can be a photo, a video file we host, or a link to YouTube/Vimeo.
 *
 * The kind is derived rather than stored, so no column had to be added to the
 * videos table. The rules below also cover a row whose video_url points at an
 * image, which happens when a picture is uploaded through the video field.
 */
export type VisualKind = "image" | "file" | "external";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv|ogg)(\?|#|$)/i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?|#|$)/i;

export type VisualLike = {
  thumbnail_url: string | null;
  video_url: string | null;
};

export function visualKind(v: VisualLike): VisualKind {
  const url = v.video_url?.trim();
  if (!url) return "image";
  // A picture in the video field is still a picture.
  if (IMAGE_EXT.test(url)) return "image";
  if (VIDEO_EXT.test(url)) return "file";
  return "external";
}

/**
 * The still to show. For a photo this may be the video_url itself, when the
 * image was uploaded into the video field.
 */
export function visualPoster(v: VisualLike): string | null {
  if (v.thumbnail_url?.trim()) return v.thumbnail_url.trim();
  const url = v.video_url?.trim();
  if (url && IMAGE_EXT.test(url)) return url;
  return null;
}

/** True when the browser can play this inline rather than opening a new tab. */
export function isPlayableInline(v: VisualLike): boolean {
  return visualKind(v) === "file";
}

/**
 * iPhones shoot HEIC, and exporting often keeps a .jpg name while the bytes
 * stay HEIC. Chrome, Firefox and Edge cannot display that, and Next's image
 * optimizer passes it through untouched, so the picture is simply blank for
 * most visitors. The extension and the browser-reported MIME type both lie
 * about it, so the file signature is the only reliable check.
 *
 * Returns an error message, or null when the file is safe to upload.
 */
export async function unsupportedImageReason(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...head.subarray(from, to));

  // ISO base media container: HEIC, HEIF and AVIF all start this way.
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12).toLowerCase();
    if (brand.startsWith("avif")) return null; // browsers do support AVIF
    return (
      "this is a HEIC photo, which most browsers cannot display. " +
      "export it as JPEG first, or set iPhone Settings, Camera, Formats to Most Compatible."
    );
  }
  return null;
}
