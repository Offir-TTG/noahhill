"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/toast";

/**
 * Press-facing copy button. Journalists lift bio text verbatim, so every bio
 * length gets a one-click copy rather than a hand-selection.
 */
export default function CopyText({
  text,
  label = "copy",
  what = "text",
}: {
  text: string;
  label?: string;
  what?: string;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${what} copied`, "Paste anywhere. Plain text, ready to use.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("couldn't copy", "Your browser blocked clipboard access. Select the text manually.");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="no-print inline-flex shrink-0 items-center gap-2 rounded-full border border-cream/20 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.25em] text-cream-dim transition hover:border-cream/50 hover:text-cream cursor-pointer"
    >
      {copied ? <Check className="size-3 text-gold" /> : <Copy className="size-3" />}
      {copied ? "copied" : label}
    </button>
  );
}
