"use client";

/**
 * The two pieces of the portal that genuinely need the browser: a clipboard
 * button, and a poller that pulls fresh server state while a crew is moving.
 *
 * Everything else in the portal is a form action, so the page works with
 * JavaScript off.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-render the portal from the server on an interval while the job is live.
 *
 * A crew ticking items off in the field is the only thing that moves this
 * page, and the customer is watching it happen. Twenty seconds is often enough
 * to feel live without hammering the server; step 10 replaces it with the
 * dispatch platform's crew-location feed.
 */
export function LiveRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);

  return null;
}

export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          // Clipboard blocked (insecure context, or the user said no). The
          // code is right there on screen to read.
        }
      }}
      className="bg-ink text-paper interactive grid place-items-center px-4 text-[11.5px] leading-none font-semibold tracking-[0.1em] uppercase"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
