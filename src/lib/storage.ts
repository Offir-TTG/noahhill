import { createClient } from "@/lib/supabase/server";

/**
 * Detect which Supabase Storage bucket a public URL belongs to.
 * Public URLs look like:
 *   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 * Returns null for URLs that don't match (external links, /public/* assets, etc.)
 */
export function bucketFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\//);
  return m?.[1] ?? null;
}

/**
 * Extract the in-bucket object path from a Supabase public URL.
 * Returns null if the URL isn't a Supabase Storage public URL.
 */
export function pathFromPublicUrl(url: string | null | undefined): { bucket: string; path: string } | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

/**
 * Best-effort delete of a single Supabase Storage file by its public URL.
 * Silently no-ops for external URLs or static /public/* assets.
 * Never throws — orphaned files are recoverable; the calling operation
 * (delete row, replace asset) shouldn't fail because of cleanup.
 */
export async function removeStorageFile(url: string | null | undefined): Promise<void> {
  const ref = pathFromPublicUrl(url);
  if (!ref) return;
  try {
    const supabase = await createClient();
    await supabase.storage.from(ref.bucket).remove([ref.path]);
  } catch {
    // swallow — see jsdoc above
  }
}

/**
 * Best-effort delete of multiple Supabase Storage files by URL.
 * Groups by bucket so each bucket only takes one round-trip.
 */
export async function removeStorageFiles(urls: (string | null | undefined)[]): Promise<void> {
  const byBucket = new Map<string, string[]>();
  for (const u of urls) {
    const ref = pathFromPublicUrl(u);
    if (!ref) continue;
    const arr = byBucket.get(ref.bucket) ?? [];
    arr.push(ref.path);
    byBucket.set(ref.bucket, arr);
  }
  if (byBucket.size === 0) return;
  try {
    const supabase = await createClient();
    await Promise.all(
      Array.from(byBucket.entries()).map(([bucket, paths]) =>
        supabase.storage.from(bucket).remove(paths),
      ),
    );
  } catch {
    // best-effort
  }
}

/**
 * Extract every Supabase Storage image URL from a markdown blob.
 * Used to clean up campaign images when a campaign is deleted.
 */
export function extractStorageUrlsFromMarkdown(md: string): string[] {
  if (!md) return [];
  const urls = new Set<string>();
  // Markdown image: ![alt](url)
  for (const m of md.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)) {
    urls.add(m[1]);
  }
  // Markdown link: [text](url) — sometimes used for non-inline images
  for (const m of md.matchAll(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)) {
    urls.add(m[1]);
  }
  // HTML <img src="url">
  for (const m of md.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    urls.add(m[1]);
  }
  return Array.from(urls).filter((u) => bucketFromPublicUrl(u) !== null);
}
