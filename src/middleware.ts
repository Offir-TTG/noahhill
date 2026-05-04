import { type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, _next/data
     * - favicon, public assets, audio files
     */
    "/((?!_next/static|_next/image|_next/data|favicon.ico|images/|music/|videos/|.*\\.(?:svg|jpg|jpeg|png|gif|webp|wav|mp3|mp4|m4a|webm)$).*)",
  ],
};
