"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AtSign, Menu, Printer, X } from "lucide-react";

const SECTIONS = [
  { id: "bio",      label: "bio" },
  { id: "music",    label: "music" },
  { id: "press",    label: "press" },
  { id: "live",     label: "live" },
  { id: "photos",   label: "photos" },
  { id: "contact",  label: "contact" },
];

export default function EpkNav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("bio");

  // Highlight the section currently crossing the upper third of the viewport.
  useEffect(() => {
    const els = SECTIONS
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header className="no-print fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[var(--ink)]/70 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 sm:px-10">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-cream/15 text-cream-dim transition hover:border-cream/50 hover:text-cream"
              aria-label="Back to noahill.com"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-display text-base font-semibold tracking-tight text-cream">noah hill</p>
              <p className="truncate text-[9px] uppercase tracking-[0.35em] text-cream-dim">press kit</p>
            </div>
          </div>

          <ul className="hidden items-center gap-8 text-sm text-cream-dim lg:flex">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`transition ${active === s.id ? "text-cream" : "hover:text-cream"}`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <a
              href="#socials"
              className="hidden items-center gap-2 rounded-full border border-cream/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cream-dim transition hover:border-cream/50 hover:text-cream sm:inline-flex"
            >
              <AtSign className="size-3.5" />
              socials
            </a>

            <button
              type="button"
              onClick={() => window.print()}
              className="group hidden items-center gap-2 rounded-full border border-cream/30 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cream transition-colors hover:bg-cream hover:text-ink sm:inline-flex cursor-pointer"
            >
              <Printer className="size-3.5" />
              save pdf
            </button>

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="flex size-10 items-center justify-center rounded-full border border-cream/20 text-cream transition hover:bg-cream/10 lg:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile fullscreen menu, mirroring the main site's overlay */}
      <div
        className={`no-print fixed inset-0 z-[60] transition-opacity duration-300 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-ink/95 backdrop-blur-md" onClick={() => setOpen(false)} />

        <div className="relative flex h-full flex-col px-6 py-6">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-semibold tracking-tight text-cream">press kit</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex size-10 items-center justify-center rounded-full border border-cream/20 text-cream transition hover:bg-cream/10"
            >
              <X className="size-5" />
            </button>
          </div>

          <ul className="mt-12 flex flex-col">
            {SECTIONS.map((s, i) => (
              <li
                key={s.id}
                className={`transition-all duration-500 ${open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
                style={{ transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }}
              >
                <a
                  href={`#${s.id}`}
                  onClick={() => setOpen(false)}
                  className="block py-3 font-display text-4xl lowercase text-cream"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>

          <a
            href="#socials"
            onClick={() => setOpen(false)}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-full border border-cream/25 px-6 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-cream"
          >
            <AtSign className="size-3.5" />
            socials
          </a>

          <button
            type="button"
            onClick={() => { setOpen(false); setTimeout(() => window.print(), 200); }}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-cream px-6 py-4 text-xs font-medium uppercase tracking-[0.2em] text-ink"
          >
            <Printer className="size-3.5" />
            save as pdf
          </button>
        </div>
      </div>
    </>
  );
}
