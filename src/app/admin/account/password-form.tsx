"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, KeyRound, Save } from "lucide-react";
import { useToast } from "@/components/toast";
import { changePassword } from "./actions";

export default function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow]       = useState(false);
  const [saving, startSave]   = useTransition();
  const toast = useToast();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startSave(async () => {
      const fd = new FormData();
      fd.append("current", current);
      fd.append("next", next);
      fd.append("confirm", confirm);

      const res = await changePassword(fd);
      if (res.ok) {
        setCurrent(""); setNext(""); setConfirm("");
        toast.success("password changed", "use the new password next time you sign in.");
      } else {
        toast.error("could not change password", res.error);
      }
    });
  };

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && next !== confirm;

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-5">
      <Field
        label="current password"
        value={current}
        onChange={setCurrent}
        type={show ? "text" : "password"}
        autoComplete="current-password"
      />

      <Field
        label="new password"
        value={next}
        onChange={setNext}
        type={show ? "text" : "password"}
        autoComplete="new-password"
        hint={tooShort ? "at least 8 characters" : undefined}
      />

      <Field
        label="confirm new password"
        value={confirm}
        onChange={setConfirm}
        type={show ? "text" : "password"}
        autoComplete="new-password"
        hint={mismatch ? "does not match" : undefined}
      />

      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-cream-dim transition hover:text-cream"
      >
        {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {show ? "hide passwords" : "show passwords"}
      </button>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving || !current || !next || !confirm || tooShort || mismatch}
          className="inline-flex items-center gap-2 rounded-full bg-cream px-6 py-3 text-xs font-medium uppercase tracking-[0.2em] text-ink transition hover:bg-gold disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <KeyRound className="size-3.5 animate-pulse" /> : <Save className="size-3.5" />}
          {saving ? "changing" : "change password"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label, value, onChange, type = "text", autoComplete, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-sm border border-cream/15 bg-steel/40 px-4 py-3 text-sm text-cream outline-none transition focus:border-cream/50"
      />
      {hint && <span className="mt-1.5 block text-[11px] text-gold/80">{hint}</span>}
    </label>
  );
}
