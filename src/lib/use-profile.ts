"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getPlayerRepository, savePlayerState } from "./account/repository";
import type { StoredState } from "./storage";

export function useProfile() {
  const pathname = usePathname();
  const [state, setState] = useState<StoredState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    let request = 0;
    const read = () => {
      const id = ++request;
      void getPlayerRepository()
        .load()
        .then((next) => {
          if (!active || id !== request) return;
          setState(next);
          setReady(true);
        });
    };
    read();
    window.addEventListener("bible-trivia-storage", read);
    window.addEventListener("storage", read);
    window.addEventListener("focus", read);
    return () => {
      active = false;
      window.removeEventListener("bible-trivia-storage", read);
      window.removeEventListener("storage", read);
      window.removeEventListener("focus", read);
    };
  }, [pathname]);

  const save = useCallback((next: StoredState) => {
    setState(next);
    savePlayerState(next);
  }, []);

  return { state, ready, save };
}
