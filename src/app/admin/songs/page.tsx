import { createClient } from "@/lib/supabase/server";
import SongListAdmin from "./song-list-admin";

export const dynamic = "force-dynamic";

export default async function AdminSongsPage() {
  const supabase = await createClient();
  const { data: songs, error } = await supabase
    .from("songs")
    .select("id, title, year, duration, audio_url, cover_url, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display lowercase text-cream text-3xl sm:text-4xl">songs</h1>
        <p className="mt-2 text-sm text-cream-dim">
          add, edit, and reorder tracks. each song's audio file is uploaded to supabase storage.
        </p>
      </div>

      {error && (
        <div className="rounded-sm border border-red-300/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          could not load songs: {error.message}
          <span className="block mt-1 text-red-300/70 normal-case">
            (have you run the migration sql in supabase?)
          </span>
        </div>
      )}

      <SongListAdmin songs={songs ?? []} />
    </div>
  );
}
