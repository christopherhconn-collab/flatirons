"use client";

/**
 * The live routing map.
 *
 * Wraps `public/dispatch-map.html` — the handoff's Leaflet implementation,
 * kept whole — and feeds it today's jobs. The map announces itself with
 * `fm-map-ready` once Leaflet has booted; we answer with the job list and push
 * again whenever it changes.
 */

import { useCallback, useEffect, useRef } from "react";

export type MapJob = {
  id: string;
  customer: string;
  from: string;
  to: string;
  crew: string | null;
  status: string;
  late: number;
};

export function RouteMap({
  jobs,
  title = "Today’s routes",
  height = 430,
}: {
  jobs: MapJob[];
  title?: string;
  height?: number;
}) {
  const frame = useRef<HTMLIFrameElement>(null);

  const push = useCallback(() => {
    frame.current?.contentWindow?.postMessage(
      { type: "fm-jobs", jobs },
      window.location.origin,
    );
  }, [jobs]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "fm-map-ready") push();
    };
    window.addEventListener("message", onMessage);
    // The frame may already be up if this component re-mounted.
    push();
    return () => window.removeEventListener("message", onMessage);
  }, [push]);

  return (
    <iframe
      ref={frame}
      src="/dispatch-map.html"
      title={title}
      className="block w-full border-0"
      style={{ height }}
    />
  );
}
