import { KeyRound, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PasswordForm from "./password-form";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
      <div className="flex items-center gap-3">
        <UserRound className="size-4 text-gold" />
        <h1 className="font-display text-2xl lowercase text-cream">account</h1>
      </div>
      <p className="mt-2 text-sm text-cream-dim">
        the sign-in used for this admin.
      </p>

      <div className="mt-8 rounded-sm border border-white/10 bg-steel/25 p-6 sm:p-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-cream-dim">signed in as</p>
        <p className="mt-2 text-cream">{user?.email ?? "unknown"}</p>
      </div>

      <div className="mt-6 rounded-sm border border-white/10 bg-steel/25 p-6 sm:p-8">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <KeyRound className="size-4 text-gold" />
          <h2 className="font-display text-xl lowercase text-cream">change password</h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-cream-dim">
          you will stay signed in on this device. any other device stays signed in
          until its session expires.
        </p>
        <div className="mt-6">
          <PasswordForm />
        </div>
      </div>
    </div>
  );
}
