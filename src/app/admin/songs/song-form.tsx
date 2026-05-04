"use client";

import { useRef, useState, useTransition } from "react";
import { createSong, updateSong } from "./actions";
import { Save, X, Music, Upload, Disc3 } from "lucide-react";
import { useToast } from "@/components/toast";
import { createClient } from "@/lib/supabase/client";

type Song = {
  id?: string;
  title: string;
  year: string | null;
  duration: string | null;
  audio_url: string | null;
  cover_url: string | null;
  sort_order: number;
};

type UploadState = { status: "idle" | "uploading" | "done"; name: string };

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "track";

async function uploadToBucket(bucket: "music" | "images", file: File, fallbackExt: string): Promise<string> {
  const ext  = file.name.split(".").pop()?.toLowerCase() || fallbackExt;
  const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export default function SongForm({ song, onClose }: { song?: Song; onClose?: () => void }) {
  const isEdit = !!song?.id;
  const [error, setError]     = useState<string | null>(null);
  const [audioUpload, setAudioUpload] = useState<UploadState>({ status: "idle", name: "" });
  const [coverUpload, setCoverUpload] = useState<UploadState>({ status: "idle", name: "" });
  const [coverPreview, setCoverPreview] = useState<string | null>(song?.cover_url ?? null);
  const [isPending, startTransition] = useTransition();
  const audioRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const onCoverPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Show local preview while editing; the real Storage URL is set on save.
    setCoverPreview(URL.createObjectURL(f));
  };

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const title    = String(fd.get("title")    ?? "").trim();
    const year     = String(fd.get("year")     ?? "").trim();
    const duration = String(fd.get("duration") ?? "").trim();
    const sort_order = Number(fd.get("sort_order") ?? 0) || 0;
    const audioFile = audioRef.current?.files?.[0] ?? null;
    const coverFile = coverRef.current?.files?.[0] ?? null;

    if (!title) { setError("Title is required."); return; }

    startTransition(async () => {
      try {
        let audio_url: string | undefined;
        let cover_url: string | undefined;

        if (audioFile && audioFile.size > 0) {
          setAudioUpload({ status: "uploading", name: audioFile.name });
          audio_url = await uploadToBucket("music", audioFile, "wav");
          setAudioUpload({ status: "done", name: audioFile.name });
        }

        if (coverFile && coverFile.size > 0) {
          setCoverUpload({ status: "uploading", name: coverFile.name });
          cover_url = await uploadToBucket("images", coverFile, "jpg");
          setCoverUpload({ status: "done", name: coverFile.name });
        }

        if (isEdit) {
          await updateSong(song!.id!, { title, year, duration, sort_order, audio_url, cover_url });
        } else {
          await createSong({ title, year, duration, sort_order, audio_url: audio_url ?? null, cover_url: cover_url ?? null });
        }

        toast.success(isEdit ? "song updated" : "song added", `"${title}" saved.`);
        onClose?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
        toast.error(isEdit ? "could not update song" : "could not add song", msg);
        setAudioUpload({ status: "idle", name: "" });
        setCoverUpload({ status: "idle", name: "" });
      }
    });
  };

  return (
    <form onSubmit={handle} className="space-y-4 rounded-sm border border-white/10 bg-steel/30 p-4 sm:p-6">
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
          <input name="year" defaultValue={song?.year ?? ""} placeholder="2026"
            className="mt-1 w-full rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 focus:border-cream/50 focus:outline-none" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">duration</label>
          <input name="duration" defaultValue={song?.duration ?? ""} placeholder="3:42"
            className="mt-1 w-full rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 focus:border-cream/50 focus:outline-none" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">sort</label>
          <input name="sort_order" type="number" defaultValue={song?.sort_order ?? 0}
            className="mt-1 w-full rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream focus:border-cream/50 focus:outline-none" />
        </div>
      </div>

      {/* Cover art */}
      <div>
        <label className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">
          cover art {isEdit && <span className="text-cream-dim/60 normal-case tracking-normal">(leave empty to keep current)</span>}
        </label>
        <div className="mt-1 grid grid-cols-[80px_1fr] gap-3 items-start">
          <div className="aspect-square rounded-sm border border-cream/10 bg-ink/40 overflow-hidden relative">
            {coverPreview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={coverPreview} alt="cover preview" className="size-full object-cover" />
            ) : (
              <div className="flex items-center justify-center size-full text-cream-dim/60">
                <Disc3 className="size-6" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              onChange={onCoverPicked}
              className="w-full text-xs text-cream-dim file:mr-3 file:rounded-sm file:border-0 file:bg-cream file:px-3 file:py-2 file:text-[10px] file:uppercase file:tracking-[0.2em] file:text-ink file:cursor-pointer hover:file:bg-gold"
            />
            {coverUpload.status === "uploading" && (
              <p className="text-[11px] text-cream-dim flex items-center gap-2">
                <Upload className="size-3 animate-pulse" /> uploading {coverUpload.name}…
              </p>
            )}
            {coverUpload.status === "done" && (
              <p className="text-[11px] text-gold flex items-center gap-2">
                <Disc3 className="size-3" /> uploaded
              </p>
            )}
            <p className="text-[10px] text-cream-dim/70">
              square art recommended (e.g. 1000×1000). this shows on the public site as the vinyl center label.
            </p>
          </div>
        </div>
      </div>

      {/* Audio */}
      <div>
        <label className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">
          audio file {isEdit && <span className="text-cream-dim/60 normal-case tracking-normal">(leave empty to keep current)</span>}
        </label>
        <input
          ref={audioRef}
          name="audio"
          type="file"
          accept="audio/*"
          className="mt-1 w-full text-xs text-cream-dim file:mr-3 file:rounded-sm file:border-0 file:bg-cream file:px-3 file:py-2 file:text-[10px] file:uppercase file:tracking-[0.2em] file:text-ink file:cursor-pointer hover:file:bg-gold"
        />
        {audioUpload.status === "uploading" && (
          <p className="mt-2 text-[11px] text-cream-dim flex items-center gap-2">
            <Upload className="size-3 animate-pulse" /> uploading {audioUpload.name}…
          </p>
        )}
        {audioUpload.status === "done" && (
          <p className="mt-2 text-[11px] text-gold flex items-center gap-2">
            <Music className="size-3" /> uploaded {audioUpload.name}
          </p>
        )}
        {song?.audio_url && audioUpload.status === "idle" && (
          <p className="mt-2 text-[10px] text-cream-dim/70 truncate flex items-center gap-2">
            <Music className="size-3 shrink-0" /> current: {song.audio_url.split("/").pop()}
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
          {isPending
            ? (audioUpload.status === "uploading" || coverUpload.status === "uploading" ? "uploading…" : "saving…")
            : isEdit ? "save changes" : "create song"}
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
