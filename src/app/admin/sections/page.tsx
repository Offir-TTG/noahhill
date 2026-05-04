import { createClient } from "@/lib/supabase/server";
import { mergeContent, DEFAULT_CONTENT, type SiteContent } from "@/lib/site-content";
import SectionsEditor from "./sections-editor";

export const dynamic = "force-dynamic";

export default async function AdminSectionsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("id", 1)
    .maybeSingle();

  const content: SiteContent = data?.data
    ? mergeContent(data.data as Partial<SiteContent>)
    : DEFAULT_CONTENT;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display lowercase text-cream text-3xl sm:text-4xl">sections</h1>
        <p className="mt-2 text-sm text-cream-dim">
          edit copy and assets for every part of the public site. changes go live as soon as you save.
        </p>
      </div>

      {error && (
        <div className="rounded-sm border border-red-300/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          could not load: {error.message}
          <span className="block mt-1 text-red-300/70 normal-case">(have you run the migration sql in supabase?)</span>
        </div>
      )}

      <SectionsEditor initial={content} />
    </div>
  );
}
