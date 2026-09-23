"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Phase = "checking" | "ready" | "invalid" | "saving" | "done";

export default function ResetPasswordForm() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const router = useRouter();

  // Supabase sends either ?code= (PKCE) or a #access_token fragment. Both have
  // to be turned into a session before the password can be changed, and the
  // fragment form is only visible to the browser, never to the server.
  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorDesc = url.searchParams.get("error_description");
      if (errorDesc) { setError(errorDesc); setPhase("invalid"); return; }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { setError(error.message); setPhase("invalid"); return; }
        setPhase("ready");
        return;
      }

      // Older recovery links put the tokens in the hash; the client picks them
      // up automatically, so just check whether a session exists.
      const { data: { session } } = await supabase.auth.getSession();
      setPhase(session ? "ready" : "invalid");
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("the two passwords do not match."); return; }

    setPhase("saving");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setPhase("ready"); return; }

    setPhase("done");
    setTimeout(() => router.push("/admin"), 1200);
  };

  if (phase === "checking") {
    return <p className="text-center text-sm text-cream-dim">checking your link…</p>;
  }

  if (phase === "invalid") {
    return (
      <div className="text-center">
        <p className="text-sm leading-relaxed text-cream-dim">
          this link is invalid or has expired.
        </p>
        {error && <p className="mt-2 text-xs text-red-300/90">{error}</p>}
        <a
          href="/admin/login"
          className="mt-6 inline-flex items-center justify-center rounded-sm border border-cream/25 px-6 py-3 text-xs uppercase tracking-[0.2em] text-cream transition hover:bg-cream/5"
        >
          back to sign in
        </a>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <p className="text-center text-sm text-cream">
        password set. taking you to the admin…
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-cream-dim" />
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="new password"
          className="w-full rounded-sm border border-cream/15 bg-steel/40 py-3 pl-11 pr-4 text-sm text-cream placeholder:text-cream-dim/70 outline-none focus:border-cream/50"
        />
      </div>
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-cream-dim" />
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="confirm new password"
          className="w-full rounded-sm border border-cream/15 bg-steel/40 py-3 pl-11 pr-4 text-sm text-cream placeholder:text-cream-dim/70 outline-none focus:border-cream/50"
        />
      </div>

      {error && <p className="text-xs leading-relaxed text-red-300/90">{error}</p>}

      <button
        type="submit"
        disabled={phase === "saving"}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-cream px-6 py-3 text-xs font-medium uppercase tracking-[0.2em] text-ink transition hover:bg-gold disabled:opacity-50"
      >
        {phase === "saving" ? "..." : "set password"}
        {phase !== "saving" && <ArrowRight className="size-3.5" />}
      </button>
    </form>
  );
}
