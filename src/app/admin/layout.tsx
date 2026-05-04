import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
import { LayoutGrid, Music, MapPin, Film, FileText, LogOut, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Login page is rendered without the chrome — middleware lets it through unauthenticated.
  if (!user) return <>{children}</>;

  const links = [
    { href: "/admin",          label: "dashboard", icon: LayoutGrid },
    { href: "/admin/sections", label: "sections",  icon: FileText  },
    { href: "/admin/songs",    label: "songs",     icon: Music     },
    { href: "/admin/videos",   label: "visuals",   icon: Film      },
    { href: "/admin/tour",     label: "tour",      icon: MapPin    },
  ];

  return (
    <div className="min-h-screen bg-ink text-cream flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/5 bg-midnight">
        <div className="px-6 py-6 border-b border-white/5">
          <Link href="/admin" className="font-display lowercase text-cream text-xl block">noah hill</Link>
          <p className="text-[10px] uppercase tracking-[0.3em] text-cream-dim mt-1">admin</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm text-cream-dim hover:bg-cream/5 hover:text-cream transition lowercase"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5 space-y-1">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between gap-3 px-3 py-2 rounded-sm text-xs uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition"
          >
            view site
            <ExternalLink className="size-3.5" />
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-sm text-xs uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition"
            >
              sign out
              <LogOut className="size-3.5" />
            </button>
          </form>
          <p className="px-3 pt-2 text-[10px] text-cream-dim/70 truncate">{user.email}</p>
        </div>
      </aside>

      {/* Mobile topbar */}
      <header className="md:hidden fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-midnight border-b border-white/5 px-4 py-3">
        <Link href="/admin" className="font-display lowercase text-cream text-lg">noah hill <span className="text-[10px] uppercase tracking-[0.3em] text-cream-dim ml-1 align-middle">admin</span></Link>
        <form action={signOut}>
          <button type="submit" className="text-[11px] uppercase tracking-[0.2em] text-cream-dim hover:text-cream transition">sign out</button>
        </form>
      </header>

      {/* Main */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        {/* Mobile section nav */}
        <nav className="md:hidden flex gap-1 overflow-x-auto no-scrollbar px-3 py-3 border-b border-white/5 bg-midnight/60 backdrop-blur sticky top-14 z-30">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 px-3 py-1.5 rounded-sm text-[11px] uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-6 sm:p-10 max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
