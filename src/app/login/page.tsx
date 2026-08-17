import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoLockup } from "@/components/logo";
import { safeNextPath } from "@/lib/access";
import { authEnabled, sessionEmail } from "@/lib/auth";
import { sendMagicLink, signInWithGitHub } from "./actions";

export const metadata: Metadata = {
  title: "Sign in — Flatirons Movers",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  email: "That doesn't look like an email address — check it and try again.",
  send: "The sign-in email couldn't be sent just now. Wait a minute and try again.",
  github: "GitHub sign-in couldn't start. Try again, or use the email link.",
  link: "That sign-in link has expired or was already used. Request a fresh one below.",
};

/**
 * The door to the customer portal.
 *
 * Customers get a magic link — they are homeowners mid-move, and a password
 * is a support call waiting to happen. Staff sign in with GitHub. Both come
 * back through /auth/callback and land on `next`.
 */
export default async function LoginPage(props: PageProps<"/login">) {
  // With auth unconfigured the portal is open and this page has no job.
  if (!authEnabled()) redirect("/");

  const params = await props.searchParams;
  const next = safeNextPath(
    typeof params.next === "string" ? params.next : null,
  );
  const sent = typeof params.sent === "string" ? params.sent : null;
  const error =
    typeof params.error === "string" ? (ERRORS[params.error] ?? null) : null;

  // Already signed in — nothing to do here. Wrong-account cases are handled
  // by the portal itself; re-signing-in requires signing out first.
  if (await sessionEmail()) redirect(next);

  return (
    <div className="bg-desk flex min-h-dvh justify-center px-4 py-[26px]">
      <div className="w-full max-w-[414px]">
        <div className="bg-ink px-[22px] pt-6 pb-7">
          <LogoLockup markWidth={28} wordSize={13} subSize={7} gap={9} tone="dark" />
          <h1 className="display text-paper mt-5 text-[28px] leading-[1.05]">
            Sign in to your move
          </h1>
          <p className="text-cream-muted mt-2 text-[13.5px] leading-[1.55]">
            We&rsquo;ll email you a sign-in link — no password to remember.
            Use the same email you booked with.
          </p>
        </div>

        <div className="bg-paper px-[22px] py-6">
          {error && (
            <p
              role="alert"
              className="border-line-strong bg-olive-tint text-ink mb-5 border p-3 text-[13.5px] leading-[1.5]"
            >
              {error}
            </p>
          )}

          {sent ? (
            <>
              <p className="text-olive mb-2 text-[10px] leading-none font-medium tracking-[0.2em] uppercase">
                Check your email
              </p>
              <p className="text-ink mb-1 text-[15px] leading-[1.55]">
                A sign-in link is on its way to{" "}
                <strong className="font-semibold">{sent}</strong>.
              </p>
              <p className="text-ink-muted text-[13.5px] leading-[1.55]">
                It signs you in on the device that opens it, so it&rsquo;s
                fine to tap it on your phone. Wrong address?{" "}
                <Link
                  href={`/login?next=${encodeURIComponent(next)}`}
                  className="underline"
                >
                  Start over
                </Link>
                .
              </p>
            </>
          ) : (
            <>
              <form action={sendMagicLink}>
                <input type="hidden" name="next" value={next} />
                <label className="block">
                  <span className="text-label text-ink-muted mb-1.5 block">
                    Email address
                  </span>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="border-line-strong bg-bg mb-3.5 w-full border p-3 text-[14.5px]"
                  />
                </label>
                <button
                  type="submit"
                  className="bg-olive text-paper text-btn-sm interactive w-full px-6 py-3.5 text-[13px]"
                >
                  Email me a sign-in link
                </button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <span className="bg-line h-px flex-1" />
                <span className="text-ink-quiet text-[10px] leading-none font-medium tracking-[0.2em] uppercase">
                  Flatirons staff
                </span>
                <span className="bg-line h-px flex-1" />
              </div>

              <form action={signInWithGitHub}>
                <input type="hidden" name="next" value={next} />
                <button
                  type="submit"
                  className="bg-ink text-paper text-btn-sm interactive w-full px-6 py-3.5 text-[13px]"
                >
                  Sign in with GitHub
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-ink-muted mt-4 text-center text-[12.5px]">
          Booked by phone and not sure which email we have?{" "}
          <a href="tel:+13035550150" className="underline">
            303.555.0150
          </a>
        </p>
      </div>
    </div>
  );
}
