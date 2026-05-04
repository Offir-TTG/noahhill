"use client";

import { useMemo, useState, useTransition } from "react";
import { Trash2, Download, Search } from "lucide-react";
import { deleteSubscriber } from "./actions";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm";

export type Subscriber = {
  id: string;
  email: string;
  source: string;
  created_at: string;
};

export default function SubscribersListAdmin({ rows }: { rows: Subscriber[] }) {
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.email.toLowerCase().includes(q));
  }, [rows, query]);

  const onDelete = async (id: string, email: string) => {
    const ok = await confirm({
      title: "remove subscriber?",
      description: `${email} will be removed from the list. they can re-subscribe at any time.`,
      confirmLabel: "remove",
      danger: true,
    });
    if (!ok) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteSubscriber(id);
        toast.success("subscriber removed", email);
      } catch (e) {
        toast.error("could not remove subscriber", e instanceof Error ? e.message : "please try again.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  const exportCsv = () => {
    const header = "email,source,joined\n";
    const body = rows
      .map((r) => `"${r.email.replace(/"/g, '""')}",${r.source},${r.created_at}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `noah-hill-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fmt = (s: string) => {
    try {
      return new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch { return s; }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-cream-dim">
          {rows.length.toLocaleString()} {rows.length === 1 ? "subscriber" : "subscribers"}
          {filtered.length !== rows.length && (
            <span className="ml-2 text-cream-dim/70 normal-case tracking-normal">
              (showing {filtered.length})
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-cream-dim" />
            <input
              type="search"
              placeholder="search email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-sm border border-cream/15 bg-ink/40 pl-9 pr-3 py-2 text-xs text-cream placeholder:text-cream-dim/60 focus:border-cream/50 focus:outline-none w-48"
            />
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 rounded-sm border border-cream/20 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Download className="size-3.5" />
            csv
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-sm border border-dashed border-white/10 p-12 text-center">
          <p className="text-cream-dim text-sm">no subscribers yet — share the site and they&apos;ll show up here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-sm border border-dashed border-white/10 p-12 text-center">
          <p className="text-cream-dim text-sm">no matches for &quot;{query}&quot;.</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5 border-y border-white/5">
          {filtered.map((row) => (
            <li
              key={row.id}
              className="grid grid-cols-12 gap-3 items-center px-4 py-3.5 hover:bg-cream/5 transition"
            >
              <span className="col-span-7 sm:col-span-6 text-sm text-cream truncate">{row.email}</span>
              <span className="col-span-3 hidden sm:block text-[11px] uppercase tracking-[0.2em] text-cream-dim">{row.source}</span>
              <span className="col-span-3 sm:col-span-2 text-xs text-cream-dim">{fmt(row.created_at)}</span>
              <span className="col-span-2 sm:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => onDelete(row.id, row.email)}
                  disabled={deletingId === row.id}
                  className="size-8 inline-flex items-center justify-center rounded-sm text-cream-dim hover:bg-red-500/15 hover:text-red-300 transition disabled:opacity-50"
                  title="Remove"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
