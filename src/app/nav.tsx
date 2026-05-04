"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";

const LINKS = [
  { label: "music",  href: "#music" },
  { label: "songs",  href: "#songs" },
  { label: "videos", href: "#videos" },
  { label: "tour",   href: "#tour" },
  { label: "about",  href: "#about" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  // Lock body scroll when menu open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 backdrop-blur-md bg-[var(--ink)]/40 border-b border-white/5">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
          <a href="#top" className="font-display text-cream text-lg tracking-tight font-semibold">
            noah hill
          </a>

          {/* Desktop links */}
          <ul className="hidden md:flex items-center gap-10 text-sm text-cream-dim">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a className="hover:text-cream transition" href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <a
              href="#music"
              className="group hidden sm:inline-flex items-center gap-2 rounded-full border border-cream/30 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cream hover:bg-cream hover:text-ink transition-colors"
            >
              listen
              <ArrowUpRight className="size-3.5 transition-transform group-hover:rotate-45" />
            </a>

            {/* Hamburger — phones only */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="md:hidden flex size-10 items-center justify-center rounded-full border border-cream/20 text-cream hover:bg-cream/10 transition"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile fullscreen overlay */}
      <div
        className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-ink/95 backdrop-blur-md" onClick={() => setOpen(false)} />

        {/* Menu */}
        <div className="relative flex h-full flex-col px-6 py-6">
          <div className="flex items-center justify-between">
            <span className="font-display text-cream text-lg tracking-tight font-semibold">noah hill</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex size-10 items-center justify-center rounded-full border border-cream/20 text-cream hover:bg-cream/10 transition"
            >
              <X className="size-5" />
            </button>
          </div>

          <ul className="mt-16 flex flex-col gap-2">
            {LINKS.map((l, i) => (
              <li
                key={l.href}
                className={`transition-all duration-500 ${open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
                style={{ transitionDelay: open ? `${100 + i * 60}ms` : "0ms" }}
              >
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block py-4 font-display lowercase text-cream text-5xl"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <a
            href="#music"
            onClick={() => setOpen(false)}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-cream px-6 py-4 text-xs font-medium uppercase tracking-[0.2em] text-ink"
          >
            listen now
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>
    </>
  );
}
