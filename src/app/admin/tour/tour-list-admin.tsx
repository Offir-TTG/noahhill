"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Plus, Save, X, ExternalLink } from "lucide-react";
import { createTourDate, updateTourDate, deleteTourDate } from "./actions";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm";

export type TourDate = {
  id: string;
  show_date: string;
  city: string;
  venue: string | null;
  country: string | null;
  ticket_url: string | null;
  sort_order: number;
};

function TourForm({ row, onClose }: { row?: TourDate; onClose: () => void }) {
  const isEdit = !!row;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const city = String(fd.get("city") ?? "").trim();
    startTransition(async () => {
      try {
        if (isEdit) await updateTourDate(row!.id, fd);
        else await createTourDate(fd);
        toast.success(isEdit ? "show updated" : "show added", city ? `${city} saved.` : undefined);
        onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Save failed.";
        setError(msg);
        toast.error(isEdit ? "could not update show" : "could not add show", msg);
      }
    });
  };

  return (
    <form onSubmit={handle} className="rounded-sm border border-white/10 bg-steel/30 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-display lowercase text-cream text-2xl">{isEdit ? "edit show" : "new show"}</p>
        <button type="button" onClick={onClose} className="text-cream-dim hover:text-cream transition" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="date"     name="show_date"  defaultValue={row?.show_date}  placeholder="MAY 18" required />
        <Field label="city"     name="city"       defaultValue={row?.city}       placeholder="New York" required />
        <Field label="country"  name="country"    defaultValue={row?.country ?? ""} placeholder="US" />
      </div>

      <Field label="venue" name="venue" defaultValue={row?.venue ?? ""} placeholder="Music Hall of Williamsburg" />
      <Field label="ticket url" name="ticket_url" defaultValue={row?.ticket_url ?? ""} type="url" placeholder="https://..." />

      <div className="grid grid-cols-3 gap-3">
        <Field label="sort" name="sort_order" type="number" defaultValue={String(row?.sort_order ?? 0)} />
      </div>

      {error && <p className="text-xs text-red-300/90">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-sm bg-cream px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {isPending ? "saving..." : isEdit ? "save" : "create"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm border border-cream/20 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition"
        >
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

export default function TourListAdmin({ rows }: { rows: TourDate[] }) {
  const [editing, setEditing] = useState<TourDate | "new" | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();

  const onDelete = async (id: string, city: string, date: string) => {
    const ok = await confirm({
      title: `delete ${city}?`,
      description: `the ${date} ${city} show will be removed from the tour list.`,
      confirmLabel: "delete",
      danger: true,
    });
    if (!ok) return;
    setDeleting(id);
    startTransition(async () => {
      try {
        await deleteTourDate(id);
        toast.success("show deleted", `${date} ${city} removed.`);
      } catch (e) {
        toast.error("could not delete show", e instanceof Error ? e.message : "please try again.");
      } finally {
        setDeleting(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.3em] text-cream-dim">{rows.length} {rows.length === 1 ? "show" : "shows"}</p>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-2 rounded-sm bg-cream px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition"
        >
          <Plus className="size-3.5" />
          add show
        </button>
      </div>

      {editing === "new" && <TourForm onClose={() => setEditing(null)} />}

      {rows.length === 0 ? (
        <div className="rounded-sm border border-dashed border-white/10 p-12 text-center">
          <p className="text-cream-dim text-sm">no shows scheduled — click <span className="text-cream">add show</span> to add the first date.</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5 border-y border-white/5">
          {rows.map((row) => {
            const open = typeof editing === "object" && editing?.id === row.id;
            return (
              <li key={row.id}>
                {open ? (
                  <div className="p-4"><TourForm row={row} onClose={() => setEditing(null)} /></div>
                ) : (
                  <div className="grid grid-cols-12 gap-3 items-center px-4 py-4 hover:bg-cream/5 transition">
                    <span className="col-span-3 sm:col-span-2 font-display text-cream text-sm">{row.show_date}</span>
                    <span className="col-span-5 sm:col-span-3 font-display lowercase text-cream text-xl">{row.city}</span>
                    <span className="col-span-4 sm:col-span-3 hidden sm:block text-xs text-cream-dim truncate">{row.venue ?? "—"}</span>
                    <span className="hidden sm:block sm:col-span-1 text-[11px] uppercase tracking-[0.2em] text-cream-dim">{row.country ?? ""}</span>
                    <div className="col-span-4 sm:col-span-3 flex justify-end items-center gap-1">
                      {row.ticket_url && (
                        <a href={row.ticket_url} target="_blank" className="size-10 sm:size-8 inline-flex items-center justify-center rounded-sm text-cream-dim hover:bg-cream/10 hover:text-cream transition" title="Tickets">
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                      <button type="button" onClick={() => setEditing(row)} className="size-10 sm:size-8 inline-flex items-center justify-center rounded-sm text-cream-dim hover:bg-cream/10 hover:text-cream transition" title="Edit">
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={deleting === row.id}
                        onClick={() => onDelete(row.id, row.city, row.show_date)}
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
