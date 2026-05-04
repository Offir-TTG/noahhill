"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Play, Plus } from "lucide-react";
import SongForm from "./song-form";
import { deleteSong } from "./actions";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm";

type Song = {
  id: string;
  title: string;
  year: string | null;
  duration: string | null;
  audio_url: string | null;
  sort_order: number;
};

export default function SongListAdmin({ songs }: { songs: Song[] }) {
  const [editing, setEditing] = useState<Song | "new" | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();

  const onDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: `delete "${title}"?`,
      description: "this removes the song row. the audio file reference is removed but the file in storage is kept (you can re-link it later).",
      confirmLabel: "delete",
      danger: true,
    });
    if (!ok) return;
    setDeleting(id);
    startTransition(async () => {
      try {
        await deleteSong(id);
        toast.success("song deleted", `"${title}" removed.`);
      } catch (e) {
        toast.error("could not delete song", e instanceof Error ? e.message : "please try again.");
      } finally {
        setDeleting(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.3em] text-cream-dim">{songs.length} {songs.length === 1 ? "track" : "tracks"}</p>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-sm bg-cream px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition"
        >
          <Plus className="size-3.5" />
          add song
        </button>
      </div>

      {editing === "new" && <SongForm onClose={() => setEditing(null)} />}

      {songs.length === 0 ? (
        <div className="rounded-sm border border-dashed border-white/10 p-12 text-center">
          <p className="text-cream-dim text-sm">no songs yet — click <span className="text-cream">add song</span> to upload your first track.</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5 border-y border-white/5 rounded-sm">
          {songs.map((song) => {
            const isThisOpen = typeof editing === "object" && editing?.id === song.id;
            return (
              <li key={song.id}>
                {isThisOpen ? (
                  <div className="p-4">
                    <SongForm song={song} onClose={() => setEditing(null)} />
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-3 items-center px-4 py-4 hover:bg-cream/5 transition">
                    <span className="col-span-1 font-display text-cream-dim text-sm">{(song.sort_order ?? 0).toString().padStart(2, "0")}</span>
                    <span className="col-span-5 sm:col-span-4 font-display lowercase text-cream text-xl">{song.title}</span>
                    <span className="col-span-2 hidden sm:block text-xs text-cream-dim">{song.year ?? "—"}</span>
                    <span className="col-span-2 hidden sm:block text-xs text-cream-dim">{song.duration ?? "—"}</span>
                    <div className="col-span-6 sm:col-span-3 flex justify-end items-center gap-1">
                      {song.audio_url && (
                        <a
                          href={song.audio_url}
                          target="_blank"
                          className="size-10 sm:size-8 inline-flex items-center justify-center rounded-sm text-cream-dim hover:bg-cream/10 hover:text-cream transition"
                          title="Preview"
                        >
                          <Play className="size-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditing(song)}
                        className="size-10 sm:size-8 inline-flex items-center justify-center rounded-sm text-cream-dim hover:bg-cream/10 hover:text-cream transition"
                        title="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={deleting === song.id}
                        onClick={() => onDelete(song.id, song.title)}
                        className="size-10 sm:size-8 inline-flex items-center justify-center rounded-sm text-cream-dim hover:bg-red-500/15 hover:text-red-300 transition disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
