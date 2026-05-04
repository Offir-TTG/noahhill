"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmApi = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = createContext<ConfirmApi | null>(null);

export function useConfirm(): ConfirmApi {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("useConfirm called outside <ConfirmProvider>; falling back to window.confirm.");
    }
    return async (opts) => (typeof window !== "undefined" ? window.confirm(opts.title) : false);
  }
  return ctx;
}

type Pending = ConfirmOptions & { resolve: (v: boolean) => void };

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmApi>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
      setOpen(true);
    });
  }, []);

  const close = useCallback((value: boolean) => {
    pending?.resolve(value);
    setOpen(false);
    // keep `pending` rendered briefly so the close transition can play
    setTimeout(() => setPending(null), 200);
  }, [pending]);

  // ESC closes (treated as cancel)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(false); };
    window.addEventListener("keydown", onKey);
    cancelBtnRef.current?.focus();
    // lock body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}

      {pending && (
        <div
          className={`fixed inset-0 z-[110] flex items-center justify-center px-4 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-ink/85 backdrop-blur-sm" onClick={() => close(false)} />

          {/* Panel */}
          <div
            className={`relative w-full max-w-md rounded-sm border border-white/10 bg-midnight shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] transition-all duration-200 ${
              open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                {pending.danger && (
                  <span className="flex size-10 items-center justify-center rounded-full bg-red-500/15 text-red-300 shrink-0">
                    <AlertTriangle className="size-5" />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <h2 id="confirm-title" className="font-display lowercase text-cream text-2xl">
                    {pending.title}
                  </h2>
                  {pending.description && (
                    <p className="mt-2 text-sm text-cream-dim leading-relaxed">{pending.description}</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  ref={cancelBtnRef}
                  type="button"
                  onClick={() => close(false)}
                  className="rounded-sm border border-cream/20 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition"
                >
                  {pending.cancelLabel ?? "cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => close(true)}
                  className={`rounded-sm px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] transition ${
                    pending.danger
                      ? "bg-red-500/90 text-white hover:bg-red-500"
                      : "bg-cream text-ink hover:bg-gold"
                  }`}
                >
                  {pending.confirmLabel ?? "confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
