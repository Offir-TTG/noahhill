import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser();

  // Admin is not "any signed-in user": Supabase signups are open by default, so
  // that would let a stranger register and walk in. Access requires the admin
  // role in app_metadata, which only the service key can set.
  const isAdmin = user?.app_metadata?.role === "admin";

  // Reachable while signed out: the sign-in page, and the password-reset page
  // that a recovery email links to.
  const path = request.nextUrl.pathname;
  const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/reset-password"];
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.includes(path);

  if (path.startsWith("/admin") && !isPublicAdminPath && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    if (user) url.searchParams.set("denied", "1");
    else url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // If an admin hits /admin/login, send them to the dashboard.
  if (path === "/admin/login" && isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}
