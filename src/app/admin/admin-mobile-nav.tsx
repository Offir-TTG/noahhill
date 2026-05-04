"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, ExternalLink, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { signOut } from "./login/actions";

type LinkSpec = { href: string; label: string; icon: LucideIcon };

export default function AdminMobileNav({
  mainLinks,
  settingsLinks,
  userEmail,
}: {
  mainLinks: LinkSpec[];
  settingsLinks: LinkSpec[];
  userEmail: string | null | undefined;
}) {
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden flex size-10 items-center justify-center rounded-full border border-cream/20 text-cream hover:bg-cream/10 transition"
      >
        <Menu className="size-5" />
      </button>

      <div
        className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-ink/95 backdrop-blur-md" onClick={() => setOpen(false)} />

        <div className="relative flex h-full flex-col px-6 py-6">
          <div className="flex items-center justify-between">
            <span className="font-display lowercase text-cream text-lg">
              noah hill <span className="text-[10px] uppercase tracking-[0.3em] text-cream-dim ml-1 align-middle">admin</span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="flex size-10 items-center justify-center rounded-full border border-cream/20 text-cream hover:bg-cream/10 transition"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="mt-10 flex-1 overflow-y-auto space-y-6">
            <ul className="space-y-1">
              {mainLinks.map((l, i) => (
                <DrawerLink key={l.href} link={l} index={i} open={open} onClick={() => setOpen(false)} />
              ))}
            </ul>

            <div>
              <p className="px-1 mb-2 text-[10px] uppercase tracking-[0.3em] text-cream-dim/60">settings</p>
              <ul className="space-y-1">
                {settingsLinks.map((l, i) => (
                  <DrawerLink key={l.href} link={l} index={mainLinks.length + i} open={open} onClick={() => setOpen(false)} />
                ))}
              </ul>
            </div>
          </nav>

          <div className="border-t border-white/5 pt-4 space-y-1">
            <Link
              href="/"
              target="_blank"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between gap-3 px-3 py-3 rounded-sm text-xs uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition"
            >
              view site
              <ExternalLink className="size-4" />
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-sm text-xs uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition"
              >
                sign out
                <LogOut className="size-4" />
              </button>
            </form>
            {userEmail && (
              <p className="px-3 pt-2 text-[10px] text-cream-dim/70 truncate">{userEmail}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function DrawerLink({
  link, index, open, onClick,
}: {
  link: LinkSpec;
  index: number;
  open: boolean;
  onClick: () => void;
}) {
  const { href, label, icon: Icon } = link;
  return (
    <li
      className={`transition-all duration-300 ${open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
      style={{ transitionDelay: open ? `${80 + index * 40}ms` : "0ms" }}
    >
      <Link
        href={href}
        onClick={onClick}
        className="flex items-center gap-3 px-3 py-3 rounded-sm font-display lowercase text-cream text-2xl hover:bg-cream/5 transition"
      >
        <Icon className="size-5 text-cream-dim" />
        {label}
      </Link>
    </li>
  );
}
