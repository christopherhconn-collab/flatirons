import type { MetadataRoute } from "next";

import { siteOrigin } from "@/lib/site-url";

/**
 * The five public marketing pages. The estimator, the portal and `/track` are
 * excluded deliberately — one is a funnel step with no standalone content, the
 * others are private to a customer.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOrigin();
  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/service-area`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/commercial`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/reviews`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];
}
