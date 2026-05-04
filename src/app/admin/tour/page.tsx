import { createClient } from "@/lib/supabase/server";
import TourListAdmin from "./tour-list-admin";

export const dynamic = "force-dynamic";

export default async function AdminTourPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("tour_dates")
    .select("id, show_date, city, venue, country, ticket_url, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display lowercase text-cream text-3xl sm:text-4xl">tour</h1>
        <p className="mt-2 text-sm text-cream-dim">add and manage upcoming show dates.</p>
      </div>

      {error && (
        <div className="rounded-sm border border-red-300/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          could not load tour dates: {error.message}
        </div>
      )}

      <TourListAdmin rows={rows ?? []} />
    </div>
  );
}
