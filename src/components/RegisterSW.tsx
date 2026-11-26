"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    try {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    } catch {
      // A blocked or unsupported worker must not break the page.
    }
  }, []);
  return null;
}
