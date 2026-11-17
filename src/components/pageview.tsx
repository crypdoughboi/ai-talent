"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** First-party page view beacon. No cookies, no third parties. */
export function PageviewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const body = JSON.stringify({ name: "page_view", path: pathname });
    try {
      if (navigator.sendBeacon) navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
      else fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
    } catch {}
  }, [pathname]);
  return null;
}
