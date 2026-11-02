"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/account/supabase";

declare global {
  interface Window {
    fums?: (command: string, payload?: unknown) => void;
    fumsData?: unknown[];
  }
}

/** Reports a scripture display to API.Bible FUMS. The token is not an API key. */
export function FumsTrack({ tokens }: { tokens: Array<string | null | undefined> }) {
  const joined = tokens.filter((token): token is string => Boolean(token && token.trim())).join("\n");

  useEffect(() => {
    const list = joined ? joined.split("\n") : [];
    if (list.length === 0 || typeof window.fums !== "function") return;
    let active = true;
    const report = () => {
      if (!active) return;
      window.fums?.("trackView", list.length === 1 ? list[0] : list);
    };
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      report();
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const userId = data.session?.user.id;
      if (userId) window.fums?.("config", { userId });
      report();
    });
    return () => {
      active = false;
    };
  }, [joined]);

  return null;
}
