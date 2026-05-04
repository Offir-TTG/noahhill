import { createClient } from "@/lib/supabase/server";
import VideoListAdmin from "./video-list-admin";

export const dynamic = "force-dynamic";

export default async function AdminVideosPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("videos")
    .select("id, title, year, duration, thumbnail_url, video_url, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display lowercase text-cream text-3xl sm:text-4xl">visuals</h1>
        <p className="mt-2 text-sm text-cream-dim">add music videos with custom thumbnails. external (youtube/vimeo) or self-hosted.</p>
      </div>

      {error && (
        <div className="rounded-sm border border-red-300/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          could not load videos: {error.message}
        </div>
      )}

      <VideoListAdmin rows={rows ?? []} />
    </div>
  );
}
