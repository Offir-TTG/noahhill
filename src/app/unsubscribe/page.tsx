import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Check, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let state: "missing" | "ok" | "error" = "missing";
  let email: string | null = null;
  let errorMsg = "";

  if (token && /^[0-9a-f-]{36}$/i.test(token)) {
    const supabase = await createClient();
    // Fetch the email so we can show it on the success page; then delete.
    const { data: row } = await supabase
      .from("subscribers")
      .select("email")
      .eq("unsubscribe_token", token)
      .maybeSingle();

    if (row) {
      email = row.email;
      const { error } = await supabase
        .from("subscribers")
        .delete()
        .eq("unsubscribe_token", token);
      if (error) {
        state = "error";
        errorMsg = error.message;
      } else {
        state = "ok";
      }
    } else {
      // Token not found — already unsubscribed or invalid. Treat as success to avoid leaking info.
      state = "ok";
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-ink px-6">
      <div className="w-full max-w-md text-center">
        <p className="font-display lowercase text-cream text-3xl">noah hill</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.4em] text-cream-dim">unsubscribe</p>

        <div className="mt-12 rounded-sm border border-white/10 bg-steel/30 p-10">
          {state === "ok" && (
            <>
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-gold/15 text-gold">
                <Check className="size-6" />
              </span>
              <h1 className="mt-6 font-display lowercase text-cream text-2xl">you&apos;re unsubscribed.</h1>
              <p className="mt-3 text-sm text-cream-dim leading-relaxed">
                {email ? <>we&apos;ve removed <span className="text-cream">{email}</span> from the list.</> : "your email has been removed from the list."}
                <span className="block mt-1">no more emails will be sent.</span>
              </p>
            </>
          )}

          {state === "missing" && (
            <>
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-cream/10 text-cream-dim">
                <AlertCircle className="size-6" />
              </span>
              <h1 className="mt-6 font-display lowercase text-cream text-2xl">link is missing.</h1>
              <p className="mt-3 text-sm text-cream-dim leading-relaxed">
                this page needs a valid unsubscribe link. check the most recent email and click the unsubscribe link there.
              </p>
            </>
          )}

          {state === "error" && (
            <>
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                <AlertCircle className="size-6" />
              </span>
              <h1 className="mt-6 font-display lowercase text-cream text-2xl">something went wrong.</h1>
              <p className="mt-3 text-sm text-cream-dim leading-relaxed">
                we couldn&apos;t complete the unsubscribe. please try again, or email
                <a href="mailto:hello@noahhillmusic.com" className="text-cream underline ml-1">hello@noahhillmusic.com</a>.
              </p>
              {errorMsg && <p className="mt-2 text-xs text-red-300/80">{errorMsg}</p>}
            </>
          )}
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full border border-cream/20 px-6 py-3 text-xs uppercase tracking-[0.2em] text-cream-dim hover:bg-cream/5 hover:text-cream transition"
        >
          back to noah hill
        </Link>
      </div>
    </main>
  );
}
