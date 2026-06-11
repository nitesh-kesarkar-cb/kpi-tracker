"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Fires a lightweight audit beacon to the server whenever the authenticated
 * route changes. Deduped per path so a re-render does not double-log, and
 * non-blocking (failures are ignored).
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const lastLogged = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastLogged.current) return;
    lastLogged.current = pathname;

    const body = JSON.stringify({ path: pathname });
    // Prefer sendBeacon (survives navigation); fall back to fetch.
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/audit/page-view", new Blob([body], { type: "application/json" }));
        return;
      }
    } catch {
      // fall through to fetch
    }
    fetch("/api/audit/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    }).catch(() => {});
  }, [pathname]);

  return null;
}
