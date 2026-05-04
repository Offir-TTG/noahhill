"use client";

import { useState, useTransition } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import type { SiteContent } from "@/lib/site-content";
import { saveSiteContent } from "./actions";

export default function SectionsEditor({ initial }: { initial: SiteContent }) {
  const [content, setContent] = useState<SiteContent>(initial);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [aboutFile, setAboutFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await saveSiteContent(content, { hero: heroFile, single: singleFile, about: aboutFile });
        setHeroFile(null); setSingleFile(null); setAboutFile(null);
        setSavedAt(Date.now());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed.");
      }
    });
  };

  // Helper to update nested fields immutably
  const update = <K extends keyof SiteContent>(key: K, partial: Partial<SiteContent[K]>) =>
    setContent((c) => ({ ...c, [key]: { ...c[key], ...partial } }));

  return (
    <div className="space-y-12">
      {/* Save bar */}
      <div className="sticky top-0 z-20 -mx-6 sm:-mx-10 px-6 sm:px-10 py-3 bg-ink/85 backdrop-blur border-b border-white/5 flex items-center justify-between gap-4">
        <div className="text-xs text-cream-dim">
          {savedAt && <span className="text-cream">saved.</span>}
          {error && <span className="text-red-300">{error}</span>}
        </div>
        <button
          onClick={save}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-sm bg-cream px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {isPending ? "saving…" : "save changes"}
        </button>
      </div>

      {/* HERO */}
      <Section title="hero" desc="the first screen visitors see — name, eyebrow, photo.">
        <Field label="eyebrow" value={content.hero.eyebrow} onChange={(v) => update("hero", { eyebrow: v })} />
        <Two>
          <Field label="name (line 1)" value={content.hero.name_line1} onChange={(v) => update("hero", { name_line1: v })} />
          <Field label="name (line 2)" value={content.hero.name_line2} onChange={(v) => update("hero", { name_line2: v })} />
        </Two>
        <Two>
          <Field label="role"     value={content.hero.role}     onChange={(v) => update("hero", { role: v })} />
          <Field label="location" value={content.hero.location} onChange={(v) => update("hero", { location: v })} />
        </Two>
        <Field label="side label (vertical text)" value={content.hero.side_label} onChange={(v) => update("hero", { side_label: v })} />
        <ImageField
          label="hero photo"
          currentUrl={content.hero.photo_url}
          file={heroFile}
          onFileChange={setHeroFile}
        />
      </Section>

      {/* MARQUEE */}
      <Section title="marquee" desc="the scrolling band of words below the hero.">
        <ListField
          label="items"
          values={content.marquee.items}
          onChange={(items) => update("marquee", { items })}
          placeholder="hurt somebody"
        />
      </Section>

      {/* SINGLE */}
      <Section title="latest single" desc="the featured release block — cover art, title, streaming links.">
        <Field label="eyebrow" value={content.single.eyebrow} onChange={(v) => update("single", { eyebrow: v })} />
        <Two>
          <Field label="title (line 1)" value={content.single.title_line1} onChange={(v) => update("single", { title_line1: v })} />
          <Field label="title (line 2)" value={content.single.title_line2} onChange={(v) => update("single", { title_line2: v })} />
        </Two>
        <TextareaField label="description" value={content.single.description} onChange={(v) => update("single", { description: v })} />
        <ImageField label="cover art" currentUrl={content.single.cover_url} file={singleFile} onFileChange={setSingleFile} />
        <PairListField
          label="streaming links"
          a="name" b="url"
          values={content.single.streaming}
          onChange={(streaming) => update("single", { streaming })}
        />
      </Section>

      {/* ABOUT */}
      <Section title="about" desc="bio paragraphs, tagline, portrait, stats.">
        <Two>
          <Field label="tagline (line 1)" value={content.about.tagline_line1} onChange={(v) => update("about", { tagline_line1: v })} />
          <Field label="tagline (line 2)" value={content.about.tagline_line2} onChange={(v) => update("about", { tagline_line2: v })} />
        </Two>
        <ListField
          label="bio paragraphs"
          values={content.about.bio}
          multiline
          onChange={(bio) => update("about", { bio })}
          placeholder="Noah Hill writes…"
        />
        <ImageField label="portrait" currentUrl={content.about.portrait_url} file={aboutFile} onFileChange={setAboutFile} />
        <PairListField
          label="stats"
          a="value" b="label"
          values={content.about.stats}
          onChange={(stats) => update("about", { stats })}
        />
      </Section>

      {/* NEWSLETTER */}
      <Section title="newsletter" desc="copy for the email signup band near the footer.">
        <Field label="eyebrow" value={content.newsletter.eyebrow} onChange={(v) => update("newsletter", { eyebrow: v })} />
        <Field label="heading" value={content.newsletter.heading} onChange={(v) => update("newsletter", { heading: v })} />
        <TextareaField label="copy" value={content.newsletter.copy} onChange={(v) => update("newsletter", { copy: v })} />
      </Section>

      {/* FOOTER */}
      <Section title="footer" desc="contact emails and social links.">
        <Two>
          <Field label="management email" value={content.footer.management_email} onChange={(v) => update("footer", { management_email: v })} />
          <Field label="press email"      value={content.footer.press_email}      onChange={(v) => update("footer", { press_email: v })} />
        </Two>
        <PairListField
          label="social links"
          a="name" b="url"
          values={content.footer.socials}
          onChange={(socials) => update("footer", { socials })}
        />
      </Section>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-white/10 bg-steel/30 p-6">
      <header className="mb-6">
        <h2 className="font-display lowercase text-cream text-2xl">{title}</h2>
        <p className="mt-1 text-xs text-cream-dim">{desc}</p>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Two({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream focus:border-cream/50 focus:outline-none"
      />
    </label>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">{label}</span>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream focus:border-cream/50 focus:outline-none"
      />
    </label>
  );
}

function ListField({
  label, values, onChange, placeholder, multiline,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">{label}</span>
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          {multiline ? (
            <textarea
              rows={2}
              value={v}
              placeholder={placeholder}
              onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
              className="flex-1 rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream focus:border-cream/50 focus:outline-none"
            />
          ) : (
            <input
              value={v}
              placeholder={placeholder}
              onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
              className="flex-1 rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream focus:border-cream/50 focus:outline-none"
            />
          )}
          <button
            type="button"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="size-9 inline-flex items-center justify-center rounded-sm text-cream-dim hover:bg-red-500/15 hover:text-red-300 transition"
            aria-label="Remove"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="inline-flex items-center gap-2 rounded-sm border border-cream/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition"
      >
        <Plus className="size-3" /> add item
      </button>
    </div>
  );
}

function PairListField<T extends Record<string, string>>({
  label, a, b, values, onChange,
}: {
  label: string;
  a: keyof T;
  b: keyof T;
  values: T[];
  onChange: (v: T[]) => void;
}) {
  const update = (i: number, key: keyof T, val: string) =>
    onChange(values.map((x, j) => (j === i ? { ...x, [key]: val } : x)));
  return (
    <div className="space-y-2">
      <span className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">{label}</span>
      {values.map((row, i) => (
        <div key={i} className="grid grid-cols-12 gap-2">
          <input
            value={row[a] ?? ""}
            placeholder={String(a)}
            onChange={(e) => update(i, a, e.target.value)}
            className="col-span-4 rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream focus:border-cream/50 focus:outline-none"
          />
          <input
            value={row[b] ?? ""}
            placeholder={String(b)}
            onChange={(e) => update(i, b, e.target.value)}
            className="col-span-7 rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream focus:border-cream/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="col-span-1 inline-flex items-center justify-center rounded-sm text-cream-dim hover:bg-red-500/15 hover:text-red-300 transition"
            aria-label="Remove"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ({ [a]: "", [b]: "" } as unknown as T)])}
        className="inline-flex items-center gap-2 rounded-sm border border-cream/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition"
      >
        <Plus className="size-3" /> add row
      </button>
    </div>
  );
}

function ImageField({
  label, currentUrl, file, onFileChange,
}: {
  label: string;
  currentUrl: string | null;
  file: File | null;
  onFileChange: (f: File | null) => void;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">{label}</label>
      <div className="mt-1 grid sm:grid-cols-[120px_1fr] gap-3 items-start">
        <div className="aspect-square rounded-sm border border-cream/10 bg-ink/40 overflow-hidden">
          {currentUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={currentUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex items-center justify-center size-full text-[10px] uppercase tracking-[0.3em] text-cream-dim/70">no image</div>
          )}
        </div>
        <div className="space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-cream-dim file:mr-3 file:rounded-sm file:border-0 file:bg-cream file:px-3 file:py-2 file:text-[10px] file:uppercase file:tracking-[0.2em] file:text-ink file:cursor-pointer hover:file:bg-gold"
          />
          {file && <p className="text-[10px] text-cream-dim/70 truncate">selected: {file.name}</p>}
          {currentUrl && (
            <p className="text-[10px] text-cream-dim/60 truncate">current: {currentUrl}</p>
          )}
        </div>
      </div>
    </div>
  );
}
