/**
 * Where every sign-in lands.
 *
 * Two shapes arrive here, and both must work:
 *
 *   ?code=…                    the PKCE flow — GitHub OAuth, and magic links
 *                              opened in the browser that requested them
 *   ?token_hash=…&type=email   a magic link opened somewhere else — the
 *                              customer asked on their laptop and tapped the
 *                              email on their phone. No code verifier cookie
 *                              exists there, so the OTP is verified directly.
 *
 * A Route Handler may write cookies, so the session lands here and the
 * redirect carries none of it in the URL.
 */

import { type NextRequest, NextResponse } from "next/server";

import type { EmailOtpType } from "@supabase/supabase-js";

import { safeNextPath } from "@/lib/access";
import { authEnabled, supabaseServer } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  if (!authEnabled()) return NextResponse.redirect(origin);

  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await supabaseServer();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Expired link, reused link, or a mangled URL. Back to the door, with the
  // destination preserved so a fresh link still goes to the right place.
  return NextResponse.redirect(
    `${origin}/login?error=link&next=${encodeURIComponent(next)}`,
  );
}
