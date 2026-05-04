import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
import { LogOut, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import AdminMobileNav from "./admin-mobile-nav";
import { MAIN_LINKS, SETTINGS_LINKS } from "./admin-links";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Login page is rendered without the chrome — middleware lets it through unauthenticated.
  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-ink text-cream md:flex">
      {/* Sidebar — fixed on desktop so it stays put when content scrolls */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-white/5 bg-midnight z-40">
        <div className="px-6 py-6 border-b border-white/5 shrink-0">
          <Link href="/admin" className="font-display lowercase text-cream text-xl block">noah hill</Link>
          <p className="text-[10px] uppercase tracking-[0.3em] text-cream-dim mt-1">admin</p>
        </div>

        {/* Scrollable nav area in case the link list overflows */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          <ul className="space-y-1">
            {MAIN_LINKS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm text-cream-dim hover:bg-cream/5 hover:text-cream transition lowercase"
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Settings group */}
          <div>
            <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.3em] text-cream-dim/60">settings</p>
            <ul className="space-y-1">
              {SETTINGS_LINKS.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm text-cream-dim hover:bg-cream/5 hover:text-cream transition lowercase"
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="p-3 border-t border-white/5 space-y-1 shrink-0">
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

      {/* Mobile topbar with hamburger drawer */}
      <header className="md:hidden fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-midnight border-b border-white/5 px-4 py-3">
        <Link href="/admin" className="font-display lowercase text-cream text-lg">
          noah hill <span className="text-[10px] uppercase tracking-[0.3em] text-cream-dim ml-1 align-middle">admin</span>
        </Link>
        <AdminMobileNav userEmail={user.email} />
      </header>

      {/* Main — offset on desktop to clear the fixed sidebar */}
      <main className="flex-1 min-w-0 pt-16 md:pt-0 md:ml-64">
        <div className="p-4 sm:p-10 max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
