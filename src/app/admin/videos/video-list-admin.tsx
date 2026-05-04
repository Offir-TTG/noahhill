"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Plus, Save, X, Film } from "lucide-react";
import { createVideo, updateVideo, deleteVideo } from "./actions";

export type Video = {
  id: string;
  title: string;
  year: string | null;
  duration: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  sort_order: number;
};

function VideoForm({ row, onClose }: { row?: Video; onClose: () => void }) {
  const isEdit = !!row;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (isEdit) await updateVideo(row!.id, fd);
        else await createVideo(fd);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed.");
      }
    });
  };

  return (
    <form onSubmit={handle} className="rounded-sm border border-white/10 bg-steel/30 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-display lowercase text-cream text-2xl">{isEdit ? "edit video" : "new video"}</p>
        <button type="button" onClick={onClose} className="text-cream-dim hover:text-cream transition" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      <Field label="title" name="title" defaultValue={row?.title ?? ""} required placeholder="hurt somebody" />

      <div className="grid grid-cols-3 gap-3">
        <Field label="year" name="year" defaultValue={row?.year ?? ""} placeholder="2026" />
        <Field label="duration" name="duration" defaultValue={row?.duration ?? ""} placeholder="3:42" />
        <Field label="sort" name="sort_order" type="number" defaultValue={String(row?.sort_order ?? 0)} />
      </div>

      <Field label="external video url (youtube, vimeo, …)" name="video_url" type="url" defaultValue={row?.video_url ?? ""} placeholder="https://youtube.com/watch?v=…" />

      <div>
        <label className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">
          thumbnail image {isEdit && <span className="text-cream-dim/60 normal-case tracking-normal">(leave empty to keep current)</span>}
        </label>
        <input
          name="thumbnail"
          type="file"
          accept="image/*"
          className="mt-1 w-full text-xs text-cream-dim file:mr-3 file:rounded-sm file:border-0 file:bg-cream file:px-3 file:py-2 file:text-[10px] file:uppercase file:tracking-[0.2em] file:text-ink file:cursor-pointer hover:file:bg-gold"
        />
        {row?.thumbnail_url && (
          <p className="mt-2 text-[10px] text-cream-dim/70 truncate flex items-center gap-2">
            <Film className="size-3 shrink-0" /> current: {row.thumbnail_url.split("/").pop()}
          </p>
        )}
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">
          self-hosted video file (optional — overrides external url)
        </label>
        <input
          name="video"
          type="file"
          accept="video/*"
          className="mt-1 w-full text-xs text-cream-dim file:mr-3 file:rounded-sm file:border-0 file:bg-cream file:px-3 file:py-2 file:text-[10px] file:uppercase file:tracking-[0.2em] file:text-ink file:cursor-pointer hover:file:bg-gold"
        />
      </div>

      {error && <p className="text-xs text-red-300/90">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 rounded-sm bg-cream px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition disabled:opacity-50">
          <Save className="size-3.5" />
          {isPending ? "saving..." : isEdit ? "save" : "create"}
        </button>
        <button type="button" onClick={onClose} className="rounded-sm border border-cream/20 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition">
          cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">{label}</span>
      <input
        {...props}
        className="mt-1 w-full rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream placeholder:text-cream-dim/60 focus:border-cream/50 focus:outline-none"
      />
    </label>
  );
}

export default function VideoListAdmin({ rows }: { rows: Video[] }) {
  const [editing, setEditing] = useState<Video | "new" | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const onDelete = (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    setDeleting(id);
    startTransition(async () => {
      try { await deleteVideo(id); }
      catch (e) { alert(e instanceof Error ? e.message : "Delete failed."); }
      finally { setDeleting(null); }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.3em] text-cream-dim">{rows.length} {rows.length === 1 ? "video" : "videos"}</p>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-sm bg-cream px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition"
        >
          <Plus className="size-3.5" />
          add video
        </button>
      </div>

      {editing === "new" && <VideoForm onClose={() => setEditing(null)} />}

      {rows.length === 0 ? (
        <div className="rounded-sm border border-dashed border-white/10 p-12 text-center">
          <p className="text-cream-dim text-sm">no videos yet — click <span className="text-cream">add video</span>.</p>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-4">
          {rows.map((row) => {
            const open = typeof editing === "object" && editing?.id === row.id;
            if (open) return (
              <li key={row.id} className="sm:col-span-2"><VideoForm row={row} onClose={() => setEditing(null)} /></li>
            );
            return (
              <li key={row.id} className="rounded-sm border border-white/10 bg-steel/30 overflow-hidden">
                <div className="aspect-video bg-ink/60 relative">
                  {row.thumbnail_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={row.thumbnail_url} alt={row.title} className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-cream-dim text-xs uppercase tracking-[0.3em]">no thumbnail</div>
                  )}
                </div>
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display lowercase text-cream text-xl truncate">{row.title}</p>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-cream-dim mt-1">
                      {row.year ?? "—"} · {row.duration ?? "—"}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditing(row)} className="size-8 inline-flex items-center justify-center rounded-sm text-cream-dim hover:bg-cream/10 hover:text-cream transition" title="Edit"><Pencil className="size-3.5" /></button>
                    <button onClick={() => onDelete(row.id, row.title)} disabled={deleting === row.id} className="size-8 inline-flex items-center justify-center rounded-sm text-cream-dim hover:bg-red-500/15 hover:text-red-300 transition disabled:opacity-50" title="Delete"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
