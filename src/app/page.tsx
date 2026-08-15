import Link from "next/link";
import { Logo } from "@/components/logo";

/**
 * Placeholder index. The real home page is built in step 4 — see
 * CLAUDE_CODE_STEPS.md, "Marketing pages". This exists so the scaffold has a
 * root route and a way into the token reference.
 */
export default function Home() {
  return (
    <main className="topo grid min-h-full place-items-center px-[34px] py-16">
      <div className="w-full max-w-[560px]">
        <Logo scale={0.8} />
        <p className="text-kicker text-olive mt-11">Scaffold · step 1 & 2</p>
        <h1 className="text-h1-sm mt-4">
          Tokens and
          <br />
          the price engine
        </h1>
        <p className="text-body-lg text-ink-lede mt-5">
          The marketing pages, the estimator and the portal are not built yet.
          What exists is the design system mapped into Tailwind and the pricing
          engine ported server-side with its test suite.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/tokens"
            className="bg-olive text-paper text-btn-sm interactive px-[18px] py-[11px] uppercase"
          >
            Token reference
          </Link>
        </div>
      </div>
    </main>
  );
}
