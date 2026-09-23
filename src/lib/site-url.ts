/**
 * The canonical origin for every absolute URL this app emits: OpenGraph and
 * canonical tags, and the unsubscribe links in campaign emails.
 *
 * Set NEXT_PUBLIC_SITE_URL in the host environment: .env.local locally, and
 * Project Settings > Environment Variables on Vercel. Note that .env.local is
 * gitignored and never deploys, so the variable has to be set on the host too.
 *
 * The fallback is the production domain rather than localhost on purpose: if
 * the variable is ever missing in production, a link that points at the real
 * site is recoverable, whereas one pointing at localhost is dead for everyone
 * who receives it.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://noahill.com"
).replace(/\/+$/, "");
