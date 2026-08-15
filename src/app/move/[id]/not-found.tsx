import Link from "next/link";

import { LogoLockup } from "@/components/logo";
import { PHONE, PHONE_HREF } from "@/lib/site";

export default function MoveNotFound() {
  return (
    <div className="bg-desk grid min-h-dvh place-items-center px-4 py-10">
      <div className="bg-bg w-[414px] max-w-full border border-[rgb(22_40_63/0.18)] p-7 shadow-[0_4px_22px_rgb(22_40_63/0.12)]">
        <LogoLockup markWidth={32} wordSize={15} subSize={8} gap={9} />
        <h1 className="text-card-title mt-7 mb-2.5">No move under that reference</h1>
        <p className="text-body-sm text-ink-body mb-6">
          References look like FM-8841 and are on your confirmation. If yours
          isn’t working, a dispatcher can find the job in seconds.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/track"
            className="bg-olive text-paper text-btn-sm interactive px-5 py-[13px] text-[13px]"
          >
            Try another reference
          </Link>
          <a
            href={PHONE_HREF}
            className="text-ink text-btn-sm interactive border border-[rgb(22_40_63/0.3)] px-5 py-[13px] text-[13px]"
          >
            Call {PHONE}
          </a>
        </div>
      </div>
    </div>
  );
}
