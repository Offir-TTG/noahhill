"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type PromptOptions = {
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  type?: "text" | "email" | "url";
  confirmLabel?: string;
  cancelLabel?: string;
};

type PromptApi = (opts: PromptOptions) => Promise<string | null>;

const PromptCtx = createContext<PromptApi | null>(null);

export function usePrompt(): PromptApi {
  const ctx = useContext(PromptCtx);
  if (!ctx) throw new Error("usePrompt must be used inside <PromptProvider>");
  return ctx;
}

type Pending = PromptOptions & { resolve: (v: string | null) => void };

export function PromptProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [value, setValue]     = useState("");
  const [open, setOpen]       = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);

  const ask = useCallback<PromptApi>((opts) => {
    return new Promise<string | null>((resolve) => {
      setPending({ ...opts, resolve });
      setValue(opts.defaultValue ?? "");
      setOpen(true);
    });
  }, []);

  const close = useCallback((result: string | null) => {
    pending?.resolve(result);
    setOpen(false);
    setTimeout(() => setPending(null), 200);
  }, [pending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(null); };
    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => inputRef.current?.focus());
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  return (
    <PromptCtx.Provider value={ask}>
      {children}

      {pending && (
        <div
          className={`fixed inset-0 z-[110] flex items-center justify-center px-4 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="prompt-title"
        >
          <div className="absolute inset-0 bg-ink/85 backdrop-blur-sm" onClick={() => close(null)} />

          <form
            onSubmit={(e) => { e.preventDefault(); close(value.trim() || null); }}
            className={`relative w-full max-w-md rounded-sm border border-white/10 bg-midnight p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] transition-all duration-200 ${
              open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <h2 id="prompt-title" className="font-display lowercase text-cream text-2xl">{pending.title}</h2>
            {pending.description && (
              <p className="mt-2 text-sm text-cream-dim leading-relaxed">{pending.description}</p>
            )}

            <input
              ref={inputRef}
              type={pending.type ?? "text"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={pending.placeholder}
              className="mt-5 w-full rounded-sm border border-cream/15 bg-ink/40 px-3 py-2.5 text-sm text-cream placeholder:text-cream-dim/60 focus:border-cream/50 focus:outline-none"
            />

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => close(null)}
                className="rounded-sm border border-cream/20 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition"
              >
                {pending.cancelLabel ?? "cancel"}
              </button>
              <button
                type="submit"
                className="rounded-sm bg-cream px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition"
              >
                {pending.confirmLabel ?? "ok"}
              </button>
            </div>
          </form>
        </div>
      )}
    </PromptCtx.Provider>
  );
}
