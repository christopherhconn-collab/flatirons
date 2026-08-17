/**
 * Sign out. POST-only: a GET that changes auth state is the kind of thing
 * prefetchers and link scanners trip over.
 */

import { type NextRequest, NextResponse } from "next/server";

import { authEnabled, supabaseServer } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (authEnabled()) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
