"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";
type Toast = { id: number; type: ToastType; title: string; message?: string };

type ToastApi = {
  show: (t: { type?: ToastType; title: string; message?: string }) => void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((xs) => xs.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: { type?: ToastType; title: string; message?: string }) => {
      const id = Date.now() + Math.random();
      setToasts((xs) => [...xs, { id, type: t.type ?? "info", title: t.title, message: t.message }]);
      // auto-dismiss
      setTimeout(() => remove(id), t.type === "error" ? 6000 : 4000);
    },
    [remove],
  );

  const api: ToastApi = {
    show: push,
    success: (title, message) => push({ type: "success", title, message }),
    error:   (title, message) => push({ type: "error",   title, message }),
    info:    (title, message) => push({ type: "info",    title, message }),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-[calc(100%-2rem)] sm:w-auto"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 10);
    return () => clearTimeout(t);
  }, []);

  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : Info;
  const accent =
    toast.type === "success" ? "text-gold border-gold/30 bg-gold/[0.06]"
    : toast.type === "error" ? "text-red-300 border-red-400/30 bg-red-500/[0.08]"
    : "text-cream border-cream/20 bg-cream/[0.05]";

  return (
    <div
      role="status"
      className={`pointer-events-auto rounded-sm border backdrop-blur-md bg-midnight/85 ${accent}
        shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)]
        transition-all duration-300 will-change-transform
        ${entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
    >
      <div className="flex items-start gap-3 px-4 py-3 sm:min-w-[280px]">
        <Icon className="size-4 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-cream lowercase">{toast.title}</p>
          {toast.message && (
            <p className="mt-0.5 text-xs text-cream-dim leading-relaxed normal-case">{toast.message}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="size-5 inline-flex items-center justify-center text-cream-dim hover:text-cream transition shrink-0"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
