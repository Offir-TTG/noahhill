"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, ShieldOff, Trash2, UserPlus, Clock } from "lucide-react";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm";
import { inviteAdmin, revokeAdmin, deleteAccount, type AdminUser } from "./actions";

export default function AdminsList({ users, meId }: { users: AdminUser[]; meId: string }) {
  const [email, setEmail] = useState("");
  const [busy, startBusy] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();

  const onInvite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startBusy(async () => {
      const fd = new FormData();
      fd.append("email", email);
      const res = await inviteAdmin(fd);
      if (res.ok) { setEmail(""); toast.success("done", res.message); }
      else toast.error("could not invite", res.error);
    });
  };

  const onRevoke = (u: AdminUser) => {
    startBusy(async () => {
      const ok = await confirm({
        title: "remove admin access?",
        description: `${u.email} will keep their account but lose access to the admin.`,
        confirmLabel: "remove access",
      });
      if (!ok) return;
      const res = await revokeAdmin(u.id);
      if (res.ok) toast.success("done", res.message);
      else toast.error("could not remove", res.error);
    });
  };

  const onDelete = (u: AdminUser) => {
    startBusy(async () => {
      const ok = await confirm({
        title: "delete this account?",
        description: `${u.email} will be deleted permanently. this cannot be undone.`,
        confirmLabel: "delete",
        danger: true,
      });
      if (!ok) return;
      const res = await deleteAccount(u.id);
      if (res.ok) toast.success("done", res.message);
      else toast.error("could not delete", res.error);
    });
  };

  return (
    <>
      <form onSubmit={onInvite} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email address"
          className="flex-1 rounded-sm border border-cream/15 bg-steel/40 px-4 py-3 text-sm text-cream placeholder:text-cream-dim/70 outline-none transition focus:border-cream/50"
        />
        <button
          type="submit"
          disabled={busy || !email}
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-cream px-6 py-3 text-xs font-medium uppercase tracking-[0.2em] text-ink transition hover:bg-gold disabled:opacity-40"
        >
          <UserPlus className="size-3.5" />
          invite admin
        </button>
      </form>
      <p className="mt-3 text-xs leading-relaxed text-cream-dim">
        they receive an email to set their own password. if they already have an
        account, it is promoted instead.
      </p>

      <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 py-4">
            <span className={u.isAdmin ? "text-gold" : "text-cream-dim/50"}>
              {u.isAdmin ? <ShieldCheck className="size-4" /> : <ShieldOff className="size-4" />}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-cream">
                {u.email}
                {u.id === meId && <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-cream-dim">you</span>}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[10px] uppercase tracking-[0.2em] text-cream-dim/70">
                <span>{u.isAdmin ? "admin" : "no access"}</span>
                {!u.confirmed && <span className="text-gold/80">invite pending</span>}
                {u.lastSignInAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-2.5" />
                    {new Date(u.lastSignInAt).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>

            {u.id !== meId && (
              <div className="flex items-center gap-2">
                {u.isAdmin && (
                  <button
                    type="button"
                    onClick={() => onRevoke(u)}
                    disabled={busy}
                    className="rounded-full border border-cream/20 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] text-cream-dim transition hover:border-cream/50 hover:text-cream disabled:opacity-40"
                  >
                    remove access
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(u)}
                  disabled={busy}
                  aria-label={`delete ${u.email}`}
                  className="flex size-8 items-center justify-center rounded-full border border-red-400/25 text-red-300/80 transition hover:border-red-400/60 hover:text-red-300 disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
