import { createClient } from "@/lib/supabase/server";
import SubscribersListAdmin from "./subscribers-list-admin";

export const dynamic = "force-dynamic";

export default async function AdminSubscribersPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("subscribers")
    .select("id, email, source, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display lowercase text-cream text-3xl sm:text-4xl">subscribers</h1>
        <p className="mt-2 text-sm text-cream-dim">
          everyone who signed up via the newsletter form. export the list to csv before sending a campaign.
        </p>
      </div>

      {error && (
        <div className="rounded-sm border border-red-300/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          could not load subscribers: {error.message}
          <span className="block mt-1 text-red-300/70 normal-case">
            (have you run the migration sql for subscribers in supabase?)
          </span>
        </div>
      )}

      <SubscribersListAdmin rows={rows ?? []} />
    </div>
  );
}
