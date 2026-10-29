import { DM_Sans, Fraunces } from "next/font/google";

/**
 * The landscaping side — irrigation and the natives guide — under the
 * Flatirons Services look. `.services-theme` (in `globals.css`) re-points the
 * movers tokens to the Services palette, type and corners for everything
 * inside it; the movers pages never see it.
 */

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export default function ServicesLayout({ children }: LayoutProps<"/">) {
  return (
    <div className={`services-theme ${fraunces.variable} ${dmSans.variable} flex flex-1 flex-col`}>
      {children}
    </div>
  );
}
