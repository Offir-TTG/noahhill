"use client";

import { useState, useTransition } from "react";
import { createSong, updateSong } from "./actions";
import { Save, X, Music } from "lucide-react";

type Song = {
  id?: string;
  title: string;
  year: string | null;
  duration: string | null;
  audio_url: string | null;
  sort_order: number;
};

export default function SongForm({ song, onClose }: { song?: Song; onClose?: () => void }) {
  const isEdit = !!song?.id;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (isEdit) await updateSong(song!.id!, fd);
        else await createSong(fd);
        onClose?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  };

  return (
    <form onSubmit={handle} className="space-y-4 rounded-sm border border-white/10 bg-steel/30 p-6">
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
          name="audio"
          type="file"
          accept="audio/*"
          required={!isEdit}
          className="mt-1 w-full text-xs text-cream-dim file:mr-3 file:rounded-sm file:border-0 file:bg-cream file:px-3 file:py-2 file:text-[10px] file:uppercase file:tracking-[0.2em] file:text-ink file:cursor-pointer hover:file:bg-gold"
        />
        {song?.audio_url && (
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
          {isPending ? "saving..." : isEdit ? "save changes" : "create song"}
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
