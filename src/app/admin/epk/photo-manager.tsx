"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImageIcon, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useToast } from "@/components/toast";
import { createClient } from "@/lib/supabase/client";
import { compressImage, formatBytes } from "@/lib/image-compress";
import { unsupportedImageReason } from "@/lib/media";
import type { PressPhoto } from "@/lib/epk-content";

/** Upload straight to Storage: a server action body is capped well below a photo. */
async function uploadToStorage(file: File, labelHint: string) {
  const { file: small, changed, originalBytes, bytes } = await compressImage(file);
  const supabase = createClient();
  const ext = small.name.split(".").pop()?.toLowerCase() || "jpg";
  const base =
    (labelHint || small.name.replace(/\.[^.]+$/, ""))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50) || "press";
  const path = `${Date.now()}-${base}.${ext}`;

  const { error } = await supabase.storage.from("images").upload(path, small, {
    cacheControl: "3600",
    upsert: false,
    contentType: small.type || undefined,
  });
  if (error) throw new Error(error.message);

  return {
    url: supabase.storage.from("images").getPublicUrl(path).data.publicUrl,
    filename: `${base}.jpg`,
    changed,
    originalBytes,
    bytes,
  };
}

/**
 * Press photos were a list of text inputs where the path had to be typed and
 * nothing was visible until the page was saved and reloaded. This shows the
 * actual picture, uploads on drop or click, and keeps the ordering controls
 * next to the thing being ordered.
 */
export default function PhotoManager({
  photos, onChange,
}: {
  photos: PressPhoto[];
  onChange: (next: PressPhoto[]) => void;
}) {
  const toast = useToast();
  const [busyIndex, setBusyIndex] = useState<number | null>(null);

  const patch = (i: number, p: Partial<PressPhoto>) =>
    onChange(photos.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const add = () =>
    onChange([
      ...photos,
      {
        url: "", label: "", credit: "photo: courtesy of the artist",
        filename: "noah-hill-press.jpg", orientation: "portrait",
      },
    ]);

  const upload = async (i: number, file: File) => {
    const reason = await unsupportedImageReason(file);
    if (reason) { toast.error("unsupported image", reason); return; }

    setBusyIndex(i);
    try {
      const r = await uploadToStorage(file, photos[i].label);
      patch(i, { url: r.url, fromSong: undefined, filename: r.filename });
      toast.success(
        "photo uploaded",
        r.changed ? `${formatBytes(r.originalBytes)} to ${formatBytes(r.bytes)}.` : undefined,
      );
    } catch (e) {
      toast.error("upload failed", e instanceof Error ? e.message : "please try again.");
    } finally {
      setBusyIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {photos.map((p, i) => (
          <PhotoCard
            key={i}
            photo={p}
            index={i}
            total={photos.length}
            busy={busyIndex === i}
            onUpload={(f) => upload(i, f)}
            onPatch={(patchValue) => patch(i, patchValue)}
            onRemove={() => onChange(photos.filter((_, j) => j !== i))}
            onMove={(dir) => move(i, dir)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-2 rounded-full border border-cream/20 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-cream-dim transition hover:border-cream/50 hover:text-cream"
      >
        <Plus className="size-3" /> add photo
      </button>
    </div>
  );
}

function PhotoCard({
  photo, index, total, busy, onUpload, onPatch, onRemove, onMove,
}: {
  photo: PressPhoto;
  index: number;
  total: number;
  busy: boolean;
  onUpload: (f: File) => void;
  onPatch: (p: Partial<PressPhoto>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const usesSongArt = !photo.url && !!photo.fromSong;

  return (
    <div className="rounded-sm border border-white/10 bg-ink/40 p-4">
      <div className="flex gap-4">
        {/* Preview doubles as the drop target and the file picker. */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onUpload(f);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
          className={`relative flex size-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-sm border bg-steel/40 transition ${
            dragging ? "border-gold" : "border-cream/15 hover:border-cream/40"
          }`}
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin text-cream-dim" />
          ) : photo.url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={photo.url} alt={photo.label || "press photo"} className="size-full object-cover" />
          ) : usesSongArt ? (
            <span className="px-2 text-center text-[9px] uppercase leading-tight tracking-[0.15em] text-cream-dim">
              song<br />cover art
            </span>
          ) : (
            <span className="flex flex-col items-center gap-1 text-cream-dim/70">
              <ImageIcon className="size-5" />
              <span className="text-[9px] uppercase tracking-[0.15em]">drop or click</span>
            </span>
          )}

          {!busy && photo.url && (
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-ink/80 py-1 text-[9px] uppercase tracking-[0.15em] text-cream-dim">
              <Upload className="size-2.5" /> replace
            </span>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={photo.label}
            onChange={(e) => onPatch({ label: e.target.value })}
            placeholder="label, e.g. primary press shot"
            className="w-full rounded-sm border border-cream/15 bg-steel/40 px-2.5 py-2 text-sm text-cream outline-none transition focus:border-cream/50"
          />
          <input
            value={photo.credit}
            onChange={(e) => onPatch({ credit: e.target.value })}
            placeholder="credit"
            className="w-full rounded-sm border border-cream/15 bg-steel/40 px-2.5 py-2 text-xs text-cream-dim outline-none transition focus:border-cream/50"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            {(["portrait", "square", "landscape"] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => onPatch({ orientation: o })}
                className={`rounded-full px-2.5 py-1 text-[9px] uppercase tracking-[0.15em] transition ${
                  photo.orientation === o
                    ? "bg-cream text-ink"
                    : "border border-cream/20 text-cream-dim hover:border-cream/50 hover:text-cream"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
        <input
          value={photo.fromSong ?? ""}
          onChange={(e) => onPatch({ fromSong: e.target.value || undefined })}
          placeholder="or use a song's cover art, by title"
          className="min-w-0 flex-1 rounded-sm border border-cream/10 bg-transparent px-2 py-1.5 text-[11px] text-cream-dim outline-none transition focus:border-cream/40"
        />
        <div className="flex shrink-0 items-center gap-1">
          <IconBtn label="move up" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp className="size-3" />
          </IconBtn>
          <IconBtn label="move down" disabled={index === total - 1} onClick={() => onMove(1)}>
            <ArrowDown className="size-3" />
          </IconBtn>
          <button
            type="button"
            onClick={onRemove}
            aria-label="remove photo"
            className="flex size-7 items-center justify-center rounded-full border border-red-400/25 text-red-300/80 transition hover:border-red-400/60 hover:text-red-300"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  label, disabled, onClick, children,
}: {
  label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-full border border-cream/15 text-cream-dim transition hover:border-cream/50 hover:text-cream disabled:opacity-30 disabled:hover:border-cream/15"
    >
      {children}
    </button>
  );
}
