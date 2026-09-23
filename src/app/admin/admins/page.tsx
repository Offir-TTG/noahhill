import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listAdmins } from "./actions";
import AdminsList from "./admins-list";

export const dynamic = "force-dynamic";

export default async function AdminsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const users = await listAdmins();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-4 text-gold" />
        <h1 className="font-display text-2xl lowercase text-cream">admins</h1>
      </div>
      <p className="mt-2 text-sm text-cream-dim">
        who can sign in and manage this site.
      </p>

      <div className="mt-8 rounded-sm border border-white/10 bg-steel/25 p-6 sm:p-8">
        <AdminsList users={users} meId={user?.id ?? ""} />
      </div>
    </div>
  );
}
