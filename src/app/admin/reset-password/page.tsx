import { Suspense } from "react";
import ResetPasswordForm from "./reset-form";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="font-display text-3xl lowercase text-cream">noah hill</p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-cream-dim">
            admin · set password
          </p>
        </div>
        <Suspense fallback={<p className="text-center text-sm text-cream-dim">loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
