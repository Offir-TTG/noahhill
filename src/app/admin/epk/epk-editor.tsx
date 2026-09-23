"use client";

import { useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import type { EpkContent } from "@/lib/epk-content";
import { saveEpkContent } from "./actions";
import PhotoManager from "./photo-manager";

export default function EpkEditor({ initial }: { initial: EpkContent }) {
  const [epk, setEpk] = useState<EpkContent>(initial);
  const [saving, startSave] = useTransition();
  const toast = useToast();

  const set = <K extends keyof EpkContent>(key: K, value: EpkContent[K]) =>
    setEpk((p) => ({ ...p, [key]: value }));

  /** Replace one entry in a list field without mutating state. */
  const at = <T,>(list: T[], i: number, patch: Partial<T>): T[] =>
    list.map((x, j) => (j === i ? { ...x, ...patch } : x));

  const save = () => {
    startSave(async () => {
      const res = await saveEpkContent(epk);
      if (res.ok) toast.success("press kit saved", "the /epk page is updated.");
      else toast.error("could not save", res.error);
    });
  };

  return (
    <div className="space-y-6">
      <Card title="cover">
        <Text label="eyebrow" value={epk.meta.eyebrow}
          onChange={(v) => set("meta", { ...epk.meta, eyebrow: v })} />
        <Row>
          <Text label="name (line 1)" value={epk.meta.title_line1}
            onChange={(v) => set("meta", { ...epk.meta, title_line1: v })} />
          <Text label="name (line 2)" value={epk.meta.title_line2}
            onChange={(v) => set("meta", { ...epk.meta, title_line2: v })} />
        </Row>
        <Area label="positioning line" value={epk.meta.positioning}
          onChange={(v) => set("meta", { ...epk.meta, positioning: v })} />
        <Text label="updated" value={epk.meta.updated}
          onChange={(v) => set("meta", { ...epk.meta, updated: v })} />
      </Card>

      <Card title="search and link preview">
        <Area
          label="one-line description"
          hint="shown in search results and when the link is shared. not displayed on the page."
          value={epk.bios.one_line}
          onChange={(v) => set("bios", { ...epk.bios, one_line: v })}
        />
      </Card>

      <Card title="at a glance" onAdd={() => set("facts", [...epk.facts, { label: "", value: "" }])}>
        {epk.facts.map((f, i) => (
          <Item key={i} onRemove={() => set("facts", epk.facts.filter((_, j) => j !== i))}>
            <Row>
              <Text label="label" value={f.label}
                onChange={(v) => set("facts", at(epk.facts, i, { label: v }))} />
              <Text label="value" value={f.value}
                onChange={(v) => set("facts", at(epk.facts, i, { value: v }))} />
            </Row>
          </Item>
        ))}
      </Card>

      <Card
        title="press quotes"
        hint="leave empty to show the coverage-lands-here state instead."
        onAdd={() => set("quotes", [...epk.quotes, { quote: "", source: "", meta: "", url: "" }])}
      >
        {epk.quotes.map((q, i) => (
          <Item key={i} onRemove={() => set("quotes", epk.quotes.filter((_, j) => j !== i))}>
            <Area label="quote" value={q.quote}
              onChange={(v) => set("quotes", at(epk.quotes, i, { quote: v }))} />
            <Row>
              <Text label="publication" value={q.source}
                onChange={(v) => set("quotes", at(epk.quotes, i, { source: v }))} />
              <Text label="detail" value={q.meta ?? ""}
                onChange={(v) => set("quotes", at(epk.quotes, i, { meta: v }))} />
            </Row>
            <Text label="link" value={q.url ?? ""}
              onChange={(v) => set("quotes", at(epk.quotes, i, { url: v }))} />
          </Item>
        ))}
      </Card>

      <Card
        title="by the numbers"
        hint="monthly listeners, countries and cities come from sections, stats. add press-only figures here."
        onAdd={() => set("numbers", [...epk.numbers, { value: "", label: "" }])}
      >
        {epk.numbers.map((n, i) => (
          <Item key={i} onRemove={() => set("numbers", epk.numbers.filter((_, j) => j !== i))}>
            <Row>
              <Text label="value" value={n.value}
                onChange={(v) => set("numbers", at(epk.numbers, i, { value: v }))} />
              <Text label="label" value={n.label}
                onChange={(v) => set("numbers", at(epk.numbers, i, { label: v }))} />
            </Row>
            <Text label="note" value={n.note ?? ""}
              onChange={(v) => set("numbers", at(epk.numbers, i, { note: v }))} />
            {n.source && (
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/80">
                live from spotify. the value above is only the fallback.
              </p>
            )}
          </Item>
        ))}
      </Card>

      <Card title="live and booking">
        <Text label="availability" value={epk.live.availability}
          onChange={(v) => set("live", { ...epk.live, availability: v })} />
        <Area label="availability note" value={epk.live.availability_note}
          onChange={(v) => set("live", { ...epk.live, availability_note: v })} />
      </Card>

      <Card
        title="press photos"
        hint="drop a file on a thumbnail or click it to upload. leave the image empty and name a song to use its cover art instead."
      >
        <PhotoManager photos={epk.photos} onChange={(next) => set("photos", next)} />
      </Card>

      <Card title="contact" onAdd={() => set("contacts", [...epk.contacts, { role: "", name: "", email: "", note: "" }])}>
        {epk.contacts.map((c, i) => (
          <Item key={i} onRemove={() => set("contacts", epk.contacts.filter((_, j) => j !== i))}>
            <Row>
              <Text label="role" value={c.role}
                onChange={(v) => set("contacts", at(epk.contacts, i, { role: v }))} />
              <Text label="email" value={c.email}
                onChange={(v) => set("contacts", at(epk.contacts, i, { email: v }))} />
            </Row>
            <Text label="note" value={c.note}
              onChange={(v) => set("contacts", at(epk.contacts, i, { note: v }))} />
          </Item>
        ))}
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-cream px-7 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-ink shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] transition hover:bg-gold disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {saving ? "saving" : "save press kit"}
        </button>
      </div>
    </div>
  );
}

/* ---------- building blocks ---------- */

function Card({ title, hint, onAdd, children }: {
  title: string; hint?: string; onAdd?: () => void; children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-white/10 bg-steel/25 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="font-display text-xl lowercase text-cream">{title}</h2>
          {hint && <p className="mt-1 text-xs leading-relaxed text-cream-dim">{hint}</p>}
        </div>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cream/20 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-cream-dim transition hover:border-cream/50 hover:text-cream"
          >
            <Plus className="size-3" /> add
          </button>
        )}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Item({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="relative rounded-sm border border-white/10 bg-ink/40 p-4 pr-12">
      <div className="space-y-3">{children}</div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="remove"
        className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full border border-red-400/25 text-red-300/80 transition hover:border-red-400/60 hover:text-red-300"
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  );
}

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-3 sm:grid-cols-2">{children}</div>
);

const inputCls =
  "mt-1.5 w-full rounded-sm border border-cream/15 bg-steel/40 px-3 py-2.5 text-sm text-cream outline-none transition focus:border-cream/50";

function Text({ label, value, onChange, hint }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.25em] text-cream-dim">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      {hint && <span className="mt-1 block text-[11px] text-cream-dim/70">{hint}</span>}
    </label>
  );
}

function Area({ label, value, onChange, hint }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.25em] text-cream-dim">{label}</span>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} resize-y leading-relaxed`}
      />
      {hint && <span className="mt-1 block text-[11px] text-cream-dim/70">{hint}</span>}
    </label>
  );
}
