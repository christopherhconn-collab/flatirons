/**
 * The site's own origin, for links that leave and come back — the tracking
 * link in every booking text and email, magic-link and OAuth redirects, the
 * sitemap, and the opt-in proof page carriers are shown.
 *
 * One definition, and it defaults to the real domain rather than to whatever
 * a hosting dashboard happens to hold. That is deliberate: production was
 * found publishing `flatirons-flatirons.vercel.app` into customer-facing
 * links because `NEXT_PUBLIC_SITE_URL` had been set to the deployment
 * address. A customer who books gets a text; the text must point at the
 * business, not at its host.
 */

/**
 * Where the business actually lives. Not configurable, because it is a fact
 * about the company rather than about an environment — and because the one
 * time it was configurable, it was configured wrong.
 *
 * `www` is not decoration: the apex is not attached to the deployment, so
 * `https://flatironsmoves.com` need not resolve.
 */
export const CANONICAL_ORIGIN = "https://www.flatironsmoves.com";

/**
 * True for a host that is a deployment address rather than the site's own:
 * `*.vercel.app`, which every preview and every project alias uses.
 */
function isDeploymentHost(host: string): boolean {
  return /(^|\.)vercel\.app$/i.test(host);
}

export function siteOrigin(): string {
  // A trailing slash here would produce `//auth/callback` everywhere.
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!raw) return CANONICAL_ORIGIN;

  let host: string;
  try {
    host = new URL(raw).hostname;
  } catch {
    // Unparseable: someone pasted a bare hostname or left a stray quote.
    // Falling back is better than emitting a broken link into an SMS.
    return CANONICAL_ORIGIN;
  }

  // `localhost` and a staging domain are legitimate overrides; a deployment
  // address is not one, however it got there.
  return isDeploymentHost(host) ? CANONICAL_ORIGIN : raw;
}
