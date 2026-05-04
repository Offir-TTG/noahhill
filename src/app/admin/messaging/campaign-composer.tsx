"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bold, Italic, Heading1, Heading2, Link as LinkIcon, Image as ImageIcon, List, Quote, Send, Save, Eye, FileText } from "lucide-react";
import { marked } from "marked";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm";
import { usePrompt } from "@/components/prompt";
import {
  createDraft,
  updateDraft,
  uploadCampaignImage,
  sendTestEmail,
  sendCampaign,
} from "./actions";

marked.setOptions({ gfm: true, breaks: true });

export type Campaign = {
  id: string | null;            // null = new
  subject: string;
  body_md: string;
  preheader: string | null;
  status: "draft" | "sending" | "sent" | "failed";
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
};

type Tab = "edit" | "preview";

export default function CampaignComposer({ initial }: { initial: Campaign }) {
  const [id, setId]               = useState<string | null>(initial.id);
  const [subject, setSubject]     = useState(initial.subject);
  const [preheader, setPreheader] = useState(initial.preheader ?? "");
  const [body, setBody]           = useState(initial.body_md);
  const [tab, setTab]             = useState<Tab>("edit");
  const [savedAt, setSavedAt]     = useState<number | null>(null);
  const [isSaving, startSaving]   = useTransition();
  const [isSending, startSending] = useTransition();
  const textareaRef               = useRef<HTMLTextAreaElement>(null);
  const fileInputRef              = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const confirmDialog = useConfirm();
  const prompt = usePrompt();

  const isLocked = initial.status === "sending" || initial.status === "sent";

  // Render markdown → HTML for preview
  const previewHtml = useMemo(() => {
    try {
      return marked.parse(body || "_(empty body)_") as string;
    } catch {
      return "<p>(could not render preview)</p>";
    }
  }, [body]);

  // Save (auto-create on first save if id is null)
  const save = () => {
    if (isLocked) return;
    startSaving(async () => {
      try {
        const fd = new FormData();
        fd.append("subject", subject);
        fd.append("body_md", body);
        fd.append("preheader", preheader);
        if (id) {
          await updateDraft(id, fd);
        } else {
          const created = await createDraft(fd);
          setId(created.id);
          // Without disturbing the URL we still update the local id; user can navigate away & back.
        }
        setSavedAt(Date.now());
        toast.success("draft saved");
      } catch (e) {
        toast.error("save failed", e instanceof Error ? e.message : "please try again.");
      }
    });
  };

  // Auto-save 1.5s after editing stops
  useEffect(() => {
    if (isLocked) return;
    const t = setTimeout(() => {
      if (subject || body || preheader) save();
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, body, preheader]);

  // ── Toolbar helpers ───────────────────────────────────────
  const wrapSelection = (before: string, after = before, fallback = "text") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const selected = value.slice(s, e) || fallback;
    const next = value.slice(0, s) + before + selected + after + value.slice(e);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = s + before.length + selected.length + after.length;
      ta.setSelectionRange(cursor, cursor);
    });
  };

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    setBody(value.slice(0, s) + text + value.slice(e));
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = s + text.length;
      ta.setSelectionRange(cursor, cursor);
    });
  };

  const insertLink = async () => {
    const url = await prompt({
      title: "insert link",
      description: "paste the destination URL.",
      placeholder: "https://...",
      type: "url",
      confirmLabel: "insert",
    });
    if (!url) return;
    wrapSelection("[", `](${url})`, "link text");
  };

  const insertImage = () => fileInputRef.current?.click();

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const fd = new FormData();
    fd.append("file", file);
    toast.info("uploading image…");
    try {
      const url = await uploadCampaignImage(fd);
      const alt = file.name.replace(/\.[^.]+$/, "");
      insertAtCursor(`\n\n![${alt}](${url})\n\n`);
      toast.success("image uploaded");
    } catch (err) {
      toast.error("upload failed", err instanceof Error ? err.message : "please try a different image.");
    }
  };

  // ── Test send ─────────────────────────────────────────────
  const onTestSend = async () => {
    const to = await prompt({
      title: "send a test",
      description: "deliver a preview to one email address. nothing is recorded.",
      placeholder: "you@example.com",
      type: "email",
      confirmLabel: "send test",
    });
    if (!to) return;
    const fd = new FormData();
    fd.append("subject", subject);
    fd.append("body_md", body);
    fd.append("preheader", preheader);
    fd.append("to", to);

    toast.info("sending test…");
    const res = await sendTestEmail(fd);
    if (res.ok) toast.success("test sent", `delivered to ${to}.`);
    else toast.error("test send failed", res.error);
  };

  // ── Real send ─────────────────────────────────────────────
  const onSend = async () => {
    if (!id) {
      toast.error("save first", "save the draft before sending.");
      return;
    }
    const ok = await confirmDialog({
      title: "send to all subscribers?",
      description: "this can't be undone — once sent, the email is on its way to every subscriber on the list.",
      confirmLabel: "send now",
      danger: false,
    });
    if (!ok) return;

    startSending(async () => {
      try {
        const result = await sendCampaign(id);
        if (result.failedCount > 0) {
          toast.error(
            `sent with ${result.failedCount} failures`,
            `${result.sentCount}/${result.recipientCount} delivered. check the campaign detail page for errors.`,
          );
        } else if (result.recipientCount === 0) {
          toast.info("no subscribers", "the list is empty — nothing was sent.");
        } else {
          toast.success("campaign sent", `${result.sentCount} emails delivered.`);
        }
      } catch (e) {
        toast.error("send failed", e instanceof Error ? e.message : "please try again.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display lowercase text-cream text-3xl sm:text-4xl">
            {initial.id ? "edit campaign" : "new campaign"}
          </h1>
          <p className="mt-2 text-sm text-cream-dim">
            compose a message to your subscribers. auto-saves as you type.
          </p>
        </div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-cream-dim">
          {isLocked
            ? <span className="text-cream">{initial.status}</span>
            : isSaving ? "saving…" : savedAt ? "saved" : "draft"}
        </div>
      </div>

      {isLocked && (
        <div className="rounded-sm border border-cream/15 bg-steel/30 px-4 py-3 text-xs text-cream-dim">
          this campaign has been {initial.status}. it&apos;s read-only now — duplicate it via &quot;new campaign&quot; to send a new version.
        </div>
      )}

      {/* Subject + preheader */}
      <div className="rounded-sm border border-white/10 bg-steel/30 p-6 space-y-4">
        <Field
          label="subject"
          value={subject}
          onChange={(v) => setSubject(v)}
          disabled={isLocked}
          placeholder="new single — hurt somebody is out"
        />
        <Field
          label="preview text (preheader)"
          hint="the first line of text shown next to the subject in inbox lists. ~80 characters."
          value={preheader}
          onChange={(v) => setPreheader(v)}
          disabled={isLocked}
          placeholder="a late-night confession — listen now."
        />
      </div>

      {/* Editor / Preview */}
      <div className="rounded-sm border border-white/10 bg-steel/30">
        {/* Tabs + toolbar */}
        <div className="flex items-center justify-between border-b border-white/10 p-2 gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <TabButton active={tab === "edit"}    onClick={() => setTab("edit")}>
              <FileText className="size-3.5" /> edit
            </TabButton>
            <TabButton active={tab === "preview"} onClick={() => setTab("preview")}>
              <Eye className="size-3.5" /> preview
            </TabButton>
          </div>
          {tab === "edit" && !isLocked && (
            <div className="flex items-center gap-1">
              <ToolbarButton onClick={() => wrapSelection("**", "**", "bold")}      title="Bold (Cmd+B)"><Bold className="size-3.5" /></ToolbarButton>
              <ToolbarButton onClick={() => wrapSelection("_",  "_",  "italic")}    title="Italic (Cmd+I)"><Italic className="size-3.5" /></ToolbarButton>
              <ToolbarButton onClick={() => insertAtCursor("\n# heading\n")}        title="Heading 1"><Heading1 className="size-3.5" /></ToolbarButton>
              <ToolbarButton onClick={() => insertAtCursor("\n## heading\n")}       title="Heading 2"><Heading2 className="size-3.5" /></ToolbarButton>
              <ToolbarButton onClick={insertLink}                                   title="Link"><LinkIcon className="size-3.5" /></ToolbarButton>
              <ToolbarButton onClick={insertImage}                                  title="Image"><ImageIcon className="size-3.5" /></ToolbarButton>
              <ToolbarButton onClick={() => insertAtCursor("\n- item\n- item\n")}   title="Bulleted list"><List className="size-3.5" /></ToolbarButton>
              <ToolbarButton onClick={() => insertAtCursor("\n> quote\n")}          title="Quote"><Quote className="size-3.5" /></ToolbarButton>
              <input type="file" ref={fileInputRef} accept="image/*" hidden onChange={handleImageFile} />
            </div>
          )}
        </div>

        {tab === "edit" ? (
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isLocked}
            placeholder="hey,&#10;&#10;quick note — the new single is out. hit reply if you&apos;re feeling it.&#10;&#10;listen here: …"
            className="block w-full min-h-[420px] bg-transparent px-6 py-5 text-sm text-cream placeholder:text-cream-dim/60 focus:outline-none resize-y font-mono leading-relaxed disabled:opacity-60"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") { e.preventDefault(); wrapSelection("**", "**", "bold"); }
              if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") { e.preventDefault(); wrapSelection("_",  "_",  "italic"); }
            }}
          />
        ) : (
          <div className="px-6 py-6">
            <div className="mx-auto max-w-2xl rounded-sm border border-white/10 bg-midnight overflow-hidden">
              {/* Subject preview */}
              <div className="px-6 py-4 border-b border-white/10">
                <p className="text-xs uppercase tracking-[0.3em] text-cream-dim">noah hill · subject</p>
                <p className="mt-2 text-cream font-display text-xl">{subject || "(no subject)"}</p>
                {preheader && <p className="mt-1 text-xs text-cream-dim">{preheader}</p>}
              </div>
              <div
                className="prose-email px-6 py-6 text-sm text-cream leading-relaxed"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
              <div className="px-6 py-4 border-t border-white/10 text-[11px] text-cream-dim">
                <p>you&apos;re receiving this because you signed up at noahhillmusic.com.</p>
                <p className="mt-1"><span className="underline">unsubscribe</span> · noah hill</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isLocked && (
        <div className="flex flex-wrap gap-2 sticky bottom-0 -mx-6 sm:-mx-10 px-6 sm:px-10 py-3 bg-ink/85 backdrop-blur border-t border-white/5 z-20">
          <button
            type="button"
            onClick={save}
            disabled={isSaving || isSending}
            className="inline-flex items-center gap-2 rounded-sm border border-cream/20 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition disabled:opacity-50"
          >
            <Save className="size-3.5" />
            {isSaving ? "saving…" : "save draft"}
          </button>
          <button
            type="button"
            onClick={onTestSend}
            disabled={isSending || !subject || !body}
            className="inline-flex items-center gap-2 rounded-sm border border-cream/20 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition disabled:opacity-50"
          >
            <Send className="size-3.5" />
            test send
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onSend}
            disabled={isSending || !id || !subject || !body}
            className="inline-flex items-center gap-2 rounded-sm bg-cream px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-ink hover:bg-gold transition disabled:opacity-50"
          >
            <Send className="size-3.5 fill-ink" />
            {isSending ? "sending…" : "send to all subscribers"}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  label, hint, value, onChange, disabled, placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="mt-1 w-full rounded-sm border border-cream/15 bg-ink/40 px-3 py-2 text-sm text-cream focus:border-cream/50 focus:outline-none disabled:opacity-60"
      />
      {hint && <span className="block mt-1 text-[10px] text-cream-dim/70">{hint}</span>}
    </label>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] transition lowercase ${
        active ? "bg-cream/10 text-cream" : "text-cream-dim hover:bg-cream/5 hover:text-cream"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="size-8 inline-flex items-center justify-center rounded-sm text-cream-dim hover:bg-cream/10 hover:text-cream transition"
    >
      {children}
    </button>
  );
}
