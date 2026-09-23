"use client";

import { useState, useTransition } from "react";
import { visualKind, unsupportedImageReason } from "@/lib/media";
import { compressImage, formatBytes } from "@/lib/image-compress";
import { createClient } from "@/lib/supabase/client";

/** Vercel caps a server action request body at about 4.5 MB, so a video has to
 *  go straight from the browser to Storage rather than through the server. */
const SERVER_ACTION_BODY_LIMIT = 4.5 * 1024 * 1024;

/** Supabase Storage rejects anything larger on the current plan. Checking here
 *  turns a failed upload into an answer before the file is sent. */
const STORAGE_FILE_LIMIT = 50 * 1024 * 1024;

/** Above this, bandwidth is the real constraint rather than storage: the plan
 *  includes 2 GB of transfer a month, so a 25 MB file is about 80 full views. */
const EGRESS_WARN_AT = 25 * 1024 * 1024;
const MONTHLY_EGRESS = 2 * 1024 * 1024 * 1024;

async function uploadVideoToStorage(file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const base = file.name.replace(/\.[^.]+$/, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "video";
  const path = `${Date.now()}-${base}.${ext}`;
  const { error } = await supabase.storage.from("videos").upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type || undefined,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return supabase.storage.from("videos").getPublicUrl(path).data.publicUrl;
}
import { Pencil, Trash2, Plus, Save, X, Film } from "lucide-react";
import { createVideo, updateVideo, deleteVideo } from "./actions";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm";

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
  // Existing rows have no stored type, so derive it the same way the public
  // page does: no video url (or an image in it) means this is a photo.
  const initialKind = row && visualKind(row) !== "image" ? "video" : "photo";
  const [kind, setKind] = useState<"photo" | "video">(initialKind);
  // An image sitting in the video field should not be offered back as a url.
  const externalUrl = row && visualKind(row) === "external" ? (row.video_url ?? "") : "";
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    startTransition(async () => {
      try {
        // Catch HEIC before it reaches storage: once uploaded it looks fine in
        // the admin list on Safari but is blank for everyone else.
        const picked = fd.get("thumbnail");
        if (picked instanceof File && picked.size > 0) {
          const reason = await unsupportedImageReason(picked);
          if (reason) { setError(reason); toast.error("unsupported image", reason); return; }

          // Shrink before upload: phone photos are far larger than anything
          // the site renders, and this costs one pass here instead of every
          // visitor downloading the original.
          const shrunk = await compressImage(picked);
          if (shrunk.changed) {
            fd.set("thumbnail", shrunk.file);
            toast.info(
              "image compressed",
              `${formatBytes(shrunk.originalBytes)} to ${formatBytes(shrunk.bytes)}.`,
            );
          }
        }
        const vid = fd.get("video");
        if (vid instanceof File && vid.size > 0) {
          if (vid.size > STORAGE_FILE_LIMIT) {
            const msg =
              `this file is ${formatBytes(vid.size)}. storage accepts up to ` +
              `${formatBytes(STORAGE_FILE_LIMIT)} per file. compress it further, ` +
              `or upload it to youtube or vimeo and paste the link above instead.`;
            setError(msg);
            toast.error("video too large", msg);
            return;
          }
          if (vid.size > EGRESS_WARN_AT) {
            const views = Math.floor(MONTHLY_EGRESS / vid.size);
            toast.info(
              `uploading ${formatBytes(vid.size)}`,
              `at this size the monthly bandwidth covers about ${views} full views. ` +
                `youtube or vimeo costs you nothing to serve.`,
            );
          } else if (vid.size > SERVER_ACTION_BODY_LIMIT) {
            toast.info("uploading video", `${formatBytes(vid.size)}. this can take a while.`);
          }
          const hostedUrl = await uploadVideoToStorage(vid);
          fd.set("video_url", hostedUrl);
          fd.delete("video");
        }

        if (isEdit) await updateVideo(row!.id, fd);
        else await createVideo(fd);
        toast.success(isEdit ? "visual updated" : "visual added", title ? `"${title}" saved.` : undefined);
        onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed.";
        setError(msg);
        toast.error(isEdit ? "could not update visual" : "could not add visual", msg);
      }
    });
  };

  return (
    <form onSubmit={handle} className="rounded-sm border border-white/10 bg-steel/30 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-display lowercase text-cream text-2xl">{isEdit ? "edit visual" : "new visual"}</p>
        <button type="button" onClick={onClose} className="text-cream-dim hover:text-cream transition" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      <div>
        <span className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">type</span>
        <div className="mt-2 flex gap-2">
          {(["photo", "video"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] transition ${
                kind === k
                  ? "bg-cream text-ink"
                  : "border border-cream/20 text-cream-dim hover:border-cream/50 hover:text-cream"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-cream-dim/70">
          {kind === "photo"
            ? "a still. no play button, and nothing to click on the site."
            : "upload a file to play it on the page, or paste a youtube/vimeo link to open it in a new tab."}
        </p>
      </div>

      <input type="hidden" name="kind" value={kind} />

      <Field label="title" name="title" defaultValue={row?.title ?? ""} required placeholder="hurt somebody" />

      <div className={`grid gap-3 ${kind === "video" ? "grid-cols-3" : "grid-cols-2"}`}>
        <Field label="year" name="year" defaultValue={row?.year ?? ""} placeholder="2026" />
        {/* A still has no runtime, so the field only applies to video. */}
        {kind === "video" && (
          <Field label="duration" name="duration" defaultValue={row?.duration ?? ""} placeholder="3:42" />
        )}
        <Field label="sort" name="sort_order" type="number" defaultValue={String(row?.sort_order ?? 0)} />
      </div>

      {kind === "video" ? (
        <Field label="external video url (youtube, vimeo, …)" name="video_url" type="url" defaultValue={externalUrl} placeholder="https://youtube.com/watch?v=…" />
      ) : (
        <input type="hidden" name="video_url" value="" />
      )}

      <div>
        <label className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">
          {kind === "photo" ? "image" : "poster image"}{" "}
          {isEdit && <span className="text-cream-dim/60 normal-case tracking-normal">(leave empty to keep current)</span>}
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

      <div className={kind === "video" ? "" : "hidden"}>
        <label className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">
          video file (optional, overrides the url above)
        </label>
        <input
          name="video"
          type="file"
          accept="video/*"
          disabled={kind !== "video"}
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
  const toast = useToast();
  const confirm = useConfirm();

  const onDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: `delete "${title}"?`,
      description: "this removes it from the visuals section.",
      confirmLabel: "delete",
      danger: true,
    });
    if (!ok) return;
    setDeleting(id);
    startTransition(async () => {
      try {
        await deleteVideo(id);
        toast.success("visual deleted", `"${title}" removed.`);
      } catch (e) {
        toast.error("could not delete visual", e instanceof Error ? e.message : "please try again.");
      } finally {
        setDeleting(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.3em] text-cream-dim">{rows.length} {rows.length === 1 ? "visual" : "visuals"}</p>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-sm bg-cream px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition"
        >
          <Plus className="size-3.5" />
          add visual
        </button>
      </div>

      {editing === "new" && <VideoForm onClose={() => setEditing(null)} />}

      {rows.length === 0 ? (
        <div className="rounded-sm border border-dashed border-white/10 p-12 text-center">
          <p className="text-cream-dim text-sm">no visuals yet. click <span className="text-cream">add visual</span>.</p>
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
                    <button onClick={() => setEditing(row)} className="size-10 sm:size-8 inline-flex items-center justify-center rounded-sm text-cream-dim hover:bg-cream/10 hover:text-cream transition" title="Edit"><Pencil className="size-3.5" /></button>
                    <button onClick={() => onDelete(row.id, row.title)} disabled={deleting === row.id} className="size-10 sm:size-8 inline-flex items-center justify-center rounded-sm text-cream-dim hover:bg-red-500/15 hover:text-red-300 transition disabled:opacity-50" title="Delete"><Trash2 className="size-3.5" /></button>
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
