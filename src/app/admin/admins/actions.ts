"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SITE_URL } from "@/lib/site-url";
import { revalidatePath } from "next/cache";

export type AdminUser = {
  id: string;
  email: string;
  isAdmin: boolean;
  confirmed: boolean;
  lastSignInAt: string | null;
  createdAt: string;
};

type Result = { ok: true; message?: string } | { ok: false; error: string };

/** Every mutation here re-checks the caller: a server action is a public endpoint. */
async function requireAdmin(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") return null;
  return { id: user.id, email: user.email ?? "" };
}

export async function listAdmins(): Promise<AdminUser[]> {
  if (!await requireAdmin()) return [];
  const svc = createServiceClient();
  const { data, error } = await svc.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) return [];
  return data.users.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    isAdmin: u.app_metadata?.role === "admin",
    confirmed: !!u.email_confirmed_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    createdAt: u.created_at,
  }));
}

/**
 * Invite someone as an admin. Supabase emails them a link to set their own
 * password, so no password is ever chosen on their behalf or sent in the clear.
 */
export async function inviteAdmin(formData: FormData): Promise<Result> {
  if (!await requireAdmin()) return { ok: false, error: "not authorised." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, error: "that doesn't look like a valid email." };
  }

  const svc = createServiceClient();
  const { data: existing } = await svc.auth.admin.listUsers({ page: 1, perPage: 100 });
  const already = existing?.users.find((u) => u.email?.toLowerCase() === email);

  // Someone who already has an account just needs the role, not an invitation.
  if (already) {
    if (already.app_metadata?.role === "admin") {
      return { ok: false, error: "that person is already an admin." };
    }
    const { error } = await svc.auth.admin.updateUserById(already.id, {
      app_metadata: { ...(already.app_metadata ?? {}), role: "admin" },
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/admins");
    return { ok: true, message: "existing account promoted to admin." };
  }

  const { error } = await svc.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/admin/reset-password`,
    data: { invited_as: "admin" },
  });
  if (error) return { ok: false, error: error.message };

  // The role is applied now so it is in place when they accept.
  const { data: fresh } = await svc.auth.admin.listUsers({ page: 1, perPage: 100 });
  const created = fresh?.users.find((u) => u.email?.toLowerCase() === email);
  if (created) {
    await svc.auth.admin.updateUserById(created.id, {
      app_metadata: { ...(created.app_metadata ?? {}), role: "admin" },
    });
  }

  revalidatePath("/admin/admins");
  return { ok: true, message: "invitation sent." };
}

export async function revokeAdmin(userId: string): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: "not authorised." };
  // Removing your own access would lock you out of the page that grants it.
  if (userId === me.id) return { ok: false, error: "you cannot remove your own admin access." };

  const svc = createServiceClient();
  const { data: { user }, error: getErr } = await svc.auth.admin.getUserById(userId);
  if (getErr || !user) return { ok: false, error: "account not found." };

  const { error } = await svc.auth.admin.updateUserById(userId, {
    app_metadata: { ...(user.app_metadata ?? {}), role: null },
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/admins");
  return { ok: true, message: "admin access removed." };
}

export async function deleteAccount(userId: string): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: "not authorised." };
  if (userId === me.id) return { ok: false, error: "you cannot delete your own account." };

  const svc = createServiceClient();
  const { error } = await svc.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/admins");
  return { ok: true, message: "account deleted." };
}
