/**
 * The site's own origin, for links that leave and come back — magic-link
 * emails, OAuth redirects, the sitemap. One definition so a misconfigured
 * environment fails the same recognizable way everywhere.
 */
export function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "https://flatironsmovers.com";
  // A trailing slash here would produce `//auth/callback` everywhere.
  return raw.replace(/\/+$/, "");
}
