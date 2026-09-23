import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { mergeEpk, type EpkContent } from "@/lib/epk-content";
import EpkEditor from "./epk-editor";

export const dynamic = "force-dynamic";

export default async function AdminEpkPage() {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("site_content")
    .select("data")
    .eq("id", 1)
    .maybeSingle();

  const raw = (row?.data ?? null) as { epk?: Partial<EpkContent> } | null;
  const epk = mergeEpk(raw?.epk ?? null);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
      <div className="flex items-center gap-3">
        <FileText className="size-4 text-gold" />
        <h1 className="font-display text-2xl lowercase text-cream">press kit</h1>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cream-dim">
        content for the <a href="/epk" className="text-cream underline">/epk</a> page.
        the bio, photos, songs, streaming links, stats and socials come from{" "}
        <a href="/admin/sections" className="text-cream underline">sections</a>,{" "}
        <a href="/admin/songs" className="text-cream underline">songs</a> and{" "}
        <a href="/admin/tour" className="text-cream underline">tour</a>, so they
        stay identical on both. only press-specific fields live here.
      </p>

      <div className="mt-8">
        <EpkEditor initial={epk} />
      </div>
    </div>
  );
}
