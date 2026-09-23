"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, requestPasswordReset } from "./actions";
import { Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/admin";

  const denied = sp.get("denied") === "1";

  const [mode, setMode] = useState<"signIn" | "reset">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.append("next", next);
    startTransition(async () => {
      if (mode === "reset") {
        const result = await requestPasswordReset(fd);
        if (result?.error) setError(result.error);
        else setSent(true);
        return;
      }
      const result = await signIn(fd);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="font-display lowercase text-cream text-3xl">noah hill</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-cream-dim">
            admin · {mode === "reset" ? "reset password" : "sign in"}
          </p>
        </div>

        {denied && (
          <p className="mb-6 rounded-sm border border-gold/25 bg-gold/5 px-4 py-3 text-xs leading-relaxed text-cream-dim">
            that account does not have admin access. ask an existing admin to
            invite you.
          </p>
        )}

        {sent && (
          <p className="mb-6 rounded-sm border border-cream/20 bg-steel/40 px-4 py-3 text-xs leading-relaxed text-cream-dim">
            if that address has an account, a reset link is on its way. check
            your inbox and spam folder.
          </p>
        )}

        <form onSubmit={handle} className="space-y-3" suppressHydrationWarning>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-cream-dim" />
            <input
              suppressHydrationWarning
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="email"
              className="w-full rounded-sm border border-cream/15 bg-steel/40 pl-11 pr-4 py-3 text-sm text-cream placeholder:text-cream-dim/70 focus:border-cream/50 focus:outline-none"
            />
          </div>
          {mode === "signIn" && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-cream-dim" />
              <input
                suppressHydrationWarning
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                placeholder="password"
                className="w-full rounded-sm border border-cream/15 bg-steel/40 pl-11 pr-4 py-3 text-sm text-cream placeholder:text-cream-dim/70 focus:border-cream/50 focus:outline-none"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-300/90 leading-relaxed">{error}</p>
          )}

          <button
            suppressHydrationWarning
            type="submit"
            disabled={isPending}
            className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-sm bg-cream px-6 py-3 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition disabled:opacity-50"
          >
            {isPending ? "..." : mode === "signIn" ? "sign in" : "email me a reset link"}
            {!isPending && <ArrowRight className="size-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => { setError(null); setSent(false); setMode(mode === "signIn" ? "reset" : "signIn"); }}
            className="w-full pt-2 text-[11px] uppercase tracking-[0.3em] text-cream-dim hover:text-cream transition"
          >
            {mode === "signIn" ? "forgot password?" : "← back to sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
