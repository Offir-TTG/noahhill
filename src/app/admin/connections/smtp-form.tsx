"use client";

import { useState, useTransition } from "react";
import { Save, Plug, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import type { SmtpConfig } from "@/lib/connections";
import { useToast } from "@/components/toast";
import { saveSmtp, testSmtp } from "./actions";

type Props = {
  initial: {
    enabled: boolean;
    config: SmtpConfig;
    /** True if the DB row has a stored password — controls the placeholder text. */
    hasStoredPassword: boolean;
  };
};

export default function SmtpForm({ initial }: Props) {
  const [enabled, setEnabled]      = useState(initial.enabled);
  const [host, setHost]            = useState(initial.config.host);
  const [port, setPort]            = useState(initial.config.port || 587);
  const [secure, setSecure]        = useState(initial.config.secure);
  const [user, setUser]            = useState(initial.config.user);
  const [pass, setPass]            = useState("");
  const [fromName, setFromName]    = useState(initial.config.from_name);
  const [fromEmail, setFromEmail]  = useState(initial.config.from_email);
  const [showPass, setShowPass]    = useState(false);

  const [savedAt, setSavedAt]   = useState<number | null>(null);
  const [testResult, setTestResult] = useState<null | { ok: boolean; message: string }>(null);
  const [isSaving, startSave]   = useTransition();
  const [isTesting, startTest]  = useTransition();
  const toast = useToast();

  const buildFormData = () => {
    const fd = new FormData();
    if (enabled) fd.append("enabled", "on");
    fd.append("host", host);
    fd.append("port", String(port));
    if (secure) fd.append("secure", "on");
    fd.append("user", user);
    fd.append("pass", pass);
    fd.append("from_name", fromName);
    fd.append("from_email", fromEmail);
    return fd;
  };

  const onSave = () => {
    startSave(async () => {
      const res = await saveSmtp(buildFormData());
      if (res.ok) {
        setSavedAt(Date.now());
        setPass("");
        toast.success("smtp settings saved");
      } else {
        toast.error("could not save", res.error);
      }
    });
  };

  const onTest = () => {
    setTestResult(null);
    startTest(async () => {
      const res = await testSmtp(buildFormData());
      if (res.ok) {
        setTestResult({ ok: true,  message: "smtp authenticated successfully — ready to send." });
        toast.success("connection ok", "smtp credentials work.");
      } else {
        setTestResult({ ok: false, message: res.error });
        toast.error("connection failed", res.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Enabled toggle */}
      <label className="flex items-center justify-between gap-4 rounded-sm border border-white/10 bg-steel/30 px-4 py-3">
        <div>
          <p className="text-sm text-cream lowercase">smtp enabled</p>
          <p className="text-[11px] text-cream-dim">when off, the site falls back to the env vars (or fails if those are empty too).</p>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-4 accent-cream"
        />
      </label>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="host" value={host} onChange={setHost} placeholder="smtp.gmail.com" required />
        <Field label="port" type="number" value={String(port)} onChange={(v) => setPort(Number(v) || 587)} />
        <label className="flex items-end gap-2 text-xs text-cream-dim pb-1.5">
          <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} className="size-4 accent-cream" />
          tls (port 465)
        </label>
      </div>

      <Field label="user" value={user} onChange={setUser} placeholder="you@example.com" required />

      <div className="block">
        <label className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">password / api key</label>
        <div className="relative mt-1">
          <input
            type={showPass ? "text" : "password"}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder={initial.hasStoredPassword ? "•••••••••••• (leave blank to keep current)" : "16-char gmail app password / api key"}
            className="w-full rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 pr-10 text-sm text-cream focus:border-cream/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPass((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-7 inline-flex items-center justify-center rounded-sm text-cream-dim hover:bg-cream/5 hover:text-cream"
            aria-label={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        </div>
        {initial.hasStoredPassword && (
          <p className="mt-1 text-[10px] text-cream-dim/70">a password is already stored. paste a new one only if you want to replace it.</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="from name"  value={fromName}  onChange={setFromName}  placeholder="Noah Hill" />
        <Field label="from email" value={fromEmail} onChange={setFromEmail} placeholder="hello@noahhillmusic.com" />
      </div>

      {testResult && (
        <div className={`flex items-start gap-2 rounded-sm border px-3 py-2 text-xs ${
          testResult.ok ? "border-gold/30 bg-gold/[0.06] text-gold" : "border-red-400/30 bg-red-500/[0.08] text-red-300"
        }`}>
          {testResult.ok ? <CheckCircle2 className="size-4 shrink-0 mt-0.5" /> : <AlertCircle className="size-4 shrink-0 mt-0.5" />}
          <span className="leading-relaxed">{testResult.message}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-sm bg-cream px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {isSaving ? "saving…" : "save"}
        </button>
        <button
          type="button"
          onClick={onTest}
          disabled={isTesting || !host || !user}
          className="inline-flex items-center gap-2 rounded-sm border border-cream/20 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition disabled:opacity-50"
        >
          <Plug className="size-3.5" />
          {isTesting ? "testing…" : "test connection"}
        </button>
        <div className="flex-1" />
        {savedAt && (
          <span className="text-[11px] uppercase tracking-[0.2em] text-gold inline-flex items-center gap-1">
            <CheckCircle2 className="size-3" /> saved
          </span>
        )}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, required, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">
        {label} {required && <span className="text-cream-dim/60">·</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream focus:border-cream/50 focus:outline-none"
      />
    </label>
  );
}
