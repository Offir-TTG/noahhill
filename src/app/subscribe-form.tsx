"use client";

import { useEffect, useState } from "react";
import { Mail, Check, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";

const FRIENDLY_ERROR: Record<string, string> = {
  // Common Supabase / Postgres error codes
  "23505": "you're already on the list — see you soon.",
  "23502": "looks like the email field is empty.",
  "22P02": "that doesn't look like a valid email.",
};

function friendlyMessage(err: { code?: string; message?: string }): string {
  if (err.code && FRIENDLY_ERROR[err.code]) return FRIENDLY_ERROR[err.code];
  const msg = (err.message ?? "").toLowerCase();
  if (msg.includes("network") || msg.includes("fetch")) return "couldn't reach the server. check your connection and try again.";
  if (msg.includes("invalid email")) return "that doesn't look like a valid email.";
  return "something went wrong. please try again in a moment.";
}

export default function SubscribeForm() {
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const toast = useToast();

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    if (!email) return;

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("subscribers")
        .insert({ email, source: "newsletter" });

      // Treat duplicate email as success — user is already subscribed.
      if (error && error.code !== "23505") {
        toast.error("couldn't subscribe", friendlyMessage(error));
        return;
      }

      setSubmittedEmail(email);
      setShowSuccess(true);
    } catch {
      toast.error("couldn't subscribe", "network issue — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form
        suppressHydrationWarning
        onSubmit={submit}
        className="mt-10 mx-auto flex max-w-md flex-col sm:flex-row gap-3"
      >
        <label className="sr-only" htmlFor="email">Email</label>
        <div className="relative flex-1">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-cream-dim" />
          <input
            suppressHydrationWarning
            id="email"
            name="email"
            type="email"
            required
            placeholder="your email address"
            disabled={loading}
            className="w-full rounded-full border border-cream/20 bg-steel/40 pl-11 pr-4 py-3.5 text-sm text-cream placeholder:text-cream-dim/70 focus:border-cream/60 focus:outline-none disabled:opacity-50"
          />
        </div>
        <button
          suppressHydrationWarning
          type="submit"
          disabled={loading}
          className="rounded-full bg-cream px-7 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition disabled:opacity-50"
        >
          {loading ? "..." : "subscribe"}
        </button>
      </form>

      {showSuccess && submittedEmail && (
        <SuccessPopup email={submittedEmail} onClose={() => setShowSuccess(false)} />
      )}
    </>
  );
}

function SuccessPopup({ email, onClose }: { email: string; onClose: () => void }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 10);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center px-4 transition-opacity duration-300 ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscribe-success-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-ink/85 backdrop-blur-md" onClick={onClose} />

      {/* Panel */}
      <div
        className={`relative w-full max-w-md rounded-sm border border-cream/15 bg-midnight p-10 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] transition-all duration-500 ${
          entered ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95"
        }`}
      >
        {/* Sparkles */}
        <span aria-hidden className="absolute -top-3 -left-3 text-gold animate-pulse">
          <Sparkles className="size-5" />
        </span>
        <span aria-hidden className="absolute -top-2 -right-4 text-gold/70 animate-pulse" style={{ animationDelay: "300ms" }}>
          <Sparkles className="size-4" />
        </span>

        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Check className="size-7" />
        </span>

        <h2 id="subscribe-success-title" className="mt-6 font-display lowercase text-cream text-3xl">
          you&apos;re in.
        </h2>
        <p className="mt-3 text-sm text-cream-dim leading-relaxed">
          we&apos;ll send a heads-up to <span className="text-cream">{email}</span> when something new is coming.
          <span className="block mt-1">talk soon.</span>
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-8 inline-flex items-center justify-center rounded-full bg-cream px-7 py-3 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition"
        >
          close
        </button>
      </div>
    </div>
  );
}
