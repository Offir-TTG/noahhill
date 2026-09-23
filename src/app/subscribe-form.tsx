"use client";

import { useEffect, useState } from "react";
import { Mail, Check, Sparkles } from "lucide-react";
import { useToast } from "@/components/toast";
import { subscribe } from "./subscribe-actions";

export default function SubscribeForm() {
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [emailed, setEmailed] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const toast = useToast();

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Captured before the await: currentTarget is null by the time it resolves.
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    if (!email) return;

    setLoading(true);

    try {
      // Server action rather than a direct insert: it also sends the welcome
      // email, which needs SMTP credentials the browser must never see.
      const result = await subscribe(email);

      if (!result.ok) {
        toast.error("couldn't subscribe", result.message);
        return;
      }

      setSubmittedEmail(email);
      setAlreadyMember(result.status === "already");
      setEmailed(result.emailed);
      setShowSuccess(true);
      form.reset();
    } catch {
      toast.error("couldn't subscribe", "network issue. please try again.");
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
        <SuccessPopup
          email={submittedEmail}
          already={alreadyMember}
          emailed={emailed}
          onClose={() => setShowSuccess(false)}
        />
      )}
    </>
  );
}

function SuccessPopup({
  email, already, emailed, onClose,
}: {
  email: string; already: boolean; emailed: boolean; onClose: () => void;
}) {
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
          {already ? "already in." : "you're in."}
        </h2>
        <p className="mt-3 text-sm text-cream-dim leading-relaxed">
          {already ? (
            <>
              <span className="text-cream">{email}</span> is already on the list.
              <span className="block mt-1">nothing else to do. talk soon.</span>
            </>
          ) : (
            <>
              {emailed ? (
                <>a welcome email is on its way to <span className="text-cream">{email}</span>.</>
              ) : (
                <><span className="text-cream">{email}</span> is on the list.</>
              )}
              <span className="block mt-1">talk soon.</span>
            </>
          )}
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
