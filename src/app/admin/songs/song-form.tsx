"use client";

import { useRef, useState, useTransition } from "react";
import { createSong, updateSong } from "./actions";
import { Save, X, Music, Upload } from "lucide-react";
import { useToast } from "@/components/toast";
import { createClient } from "@/lib/supabase/client";

type Song = {
  id?: string;
  title: string;
  year: string | null;
  duration: string | null;
  audio_url: string | null;
  sort_order: number;
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "track";

export default function SongForm({ song, onClose }: { song?: Song; onClose?: () => void }) {
  const isEdit = !!song?.id;
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ status: "idle" | "uploading" | "done"; pct: number; name: string }>({
    status: "idle", pct: 0, name: "",
  });
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  /** Upload directly from the browser to Supabase Storage, return the public URL. */
  async function uploadAudioToStorage(file: File): Promise<string> {
    const ext  = file.name.split(".").pop()?.toLowerCase() || "wav";
    const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.${ext}`;

    setUploadProgress({ status: "uploading", pct: 0, name: file.name });

    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from("music")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
    if (upErr) {
      setUploadProgress({ status: "idle", pct: 0, name: "" });
      throw new Error(`Upload failed: ${upErr.message}`);
    }

    const { data: pub } = supabase.storage.from("music").getPublicUrl(path);
    setUploadProgress({ status: "done", pct: 100, name: file.name });
    return pub.publicUrl;
  }

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const title    = String(fd.get("title")    ?? "").trim();
    const year     = String(fd.get("year")     ?? "").trim();
    const duration = String(fd.get("duration") ?? "").trim();
    const sort_order = Number(fd.get("sort_order") ?? 0) || 0;
    const file = fileRef.current?.files?.[0] ?? null;

    if (!title) { setError("Title is required."); return; }

    startTransition(async () => {
      try {
        let audio_url: string | null | undefined = undefined;
        if (file && file.size > 0) {
          audio_url = await uploadAudioToStorage(file);
        }

        if (isEdit) {
          await updateSong(song!.id!, { title, year, duration, sort_order, audio_url });
        } else {
          if (!audio_url) {
            // For new songs we want an audio file; allow without it but warn.
            await createSong({ title, year, duration, sort_order, audio_url: null });
          } else {
            await createSong({ title, year, duration, sort_order, audio_url });
          }
        }
        toast.success(isEdit ? "song updated" : "song added", `"${title}" saved.`);
        onClose?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
        toast.error(isEdit ? "could not update song" : "could not add song", msg);
        setUploadProgress({ status: "idle", pct: 0, name: "" });
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handle} className="space-y-4 rounded-sm border border-white/10 bg-steel/30 p-6">
      <div className="flex items-center justify-between">
        <p className="font-display lowercase text-cream text-2xl">{isEdit ? "edit song" : "new song"}</p>
        {onClose && (
          <button type="button" onClick={onClose} className="text-cream-dim hover:text-cream transition" aria-label="Close">
            <X className="size-4" />
          </button>
        )}
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">title</label>
        <input
          name="title"
          required
          defaultValue={song?.title ?? ""}
          placeholder="hurt somebody"
          className="mt-1 w-full rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 focus:border-cream/50 focus:outline-none lowercase"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">year</label>
          <input
            name="year"
            defaultValue={song?.year ?? ""}
            placeholder="2026"
            className="mt-1 w-full rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 focus:border-cream/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">duration</label>
          <input
            name="duration"
            defaultValue={song?.duration ?? ""}
            placeholder="3:42"
            className="mt-1 w-full rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 focus:border-cream/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">sort</label>
          <input
            name="sort_order"
            type="number"
            defaultValue={song?.sort_order ?? 0}
            className="mt-1 w-full rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream focus:border-cream/50 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">
          audio file {isEdit && <span className="text-cream-dim/60 normal-case tracking-normal">(leave empty to keep current)</span>}
        </label>
        <input
          ref={fileRef}
          name="audio"
          type="file"
          accept="audio/*"
          className="mt-1 w-full text-xs text-cream-dim file:mr-3 file:rounded-sm file:border-0 file:bg-cream file:px-3 file:py-2 file:text-[10px] file:uppercase file:tracking-[0.2em] file:text-ink file:cursor-pointer hover:file:bg-gold"
        />
        {uploadProgress.status === "uploading" && (
          <p className="mt-2 text-[11px] text-cream-dim flex items-center gap-2">
            <Upload className="size-3 animate-pulse" />
            uploading {uploadProgress.name}…
          </p>
        )}
        {uploadProgress.status === "done" && (
          <p className="mt-2 text-[11px] text-gold flex items-center gap-2">
            <Music className="size-3" />
            uploaded {uploadProgress.name}
          </p>
        )}
        {song?.audio_url && uploadProgress.status === "idle" && (
          <p className="mt-2 text-[10px] text-cream-dim/70 truncate flex items-center gap-2">
            <Music className="size-3 shrink-0" />
            current: {song.audio_url.split("/").pop()}
          </p>
        )}
      </div>

      {error && <p className="text-xs text-red-300/90">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-sm bg-cream px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {isPending ? (uploadProgress.status === "uploading" ? "uploading…" : "saving…") : isEdit ? "save changes" : "create song"}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-cream/20 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition"
          >
            cancel
          </button>
        )}
      </div>
    </form>
  );
}
