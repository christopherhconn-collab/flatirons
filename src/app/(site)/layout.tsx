import { SiteFooter, SiteHeader } from "@/components/site-chrome";

/**
 * The five public marketing pages share this chrome. The estimator, the portal
 * and the token reference sit outside the group because they carry their own.
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
