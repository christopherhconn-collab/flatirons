"use server";

/**
 * The two ways in. Both hand off to Supabase and come back through
 * `/auth/callback`.
 *
 * The redirect target is echoed through the whole flow as `next` so that a
 * customer who followed a link to `/move/FM-8841` lands back on it after the
 * magic link. `safeNextPath` collapses anything that is not a same-origin
 * path — the value round-trips through an email, so it is attacker-writable.
 */

import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/access";
import { authEnabled, supabaseServer } from "@/lib/auth";
import { siteOrigin } from "@/lib/site-url";

export async function sendMagicLink(formData: FormData): Promise<void> {
  if (!authEnabled()) redirect("/");

  const email = String(formData.get("email") ?? "").trim();
  const next = safeNextPath(String(formData.get("next") ?? ""));
  if (!email.includes("@")) {
    redirect(`/login?error=email&next=${encodeURIComponent(next)}`);
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  // "sent" either way once the address is plausible: whether an account
  // exists for an email is not something this form should disclose. Supabase
  // rate-limits the sends.
  if (error) {
    redirect(`/login?error=send&next=${encodeURIComponent(next)}`);
  }
  redirect(`/login?sent=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}

export async function signInWithGitHub(formData: FormData): Promise<void> {
  if (!authEnabled()) redirect("/");

  const next = safeNextPath(String(formData.get("next") ?? ""));
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=github&next=${encodeURIComponent(next)}`);
  }
  redirect(data.url);
}
