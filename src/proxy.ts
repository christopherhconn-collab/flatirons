/**
 * Session refresh, and nothing else.
 *
 * Next 16 renamed `middleware` to `proxy` — same contract. This runs before
 * the routes it matches and exists for one reason: an expired Supabase access
 * token can only be refreshed somewhere that may write cookies, and rendering
 * may not. `getUser()` performs the refresh through the cookie adapter; the
 * dance where `setAll` rebuilds the response is the documented @supabase/ssr
 * pattern for keeping request and response cookies in step.
 *
 * No authorization happens here. The gate on the portal is
 * `requireMoveAccess` in `src/lib/auth.ts`, at the page and inside every
 * Server Function — proxy code is bypassable by design (it never runs for
 * a direct POST to a Server Function), so nothing may *depend* on it beyond
 * token freshness.
 *
 * With auth unconfigured this matches and immediately passes through.
 */

import { type NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Only where sessions matter. The marketing pages, the estimator and the
  // static assets never read one, and this hop is a network round-trip when
  // a token needs refreshing.
  matcher: ["/move/:path*", "/login", "/auth/:path*"],
};
