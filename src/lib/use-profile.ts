"use client";

import { useCallback, useEffect, useState } from "react";
import { getPlayerRepository, savePlayerState } from "./account/repository";
import type { StoredState } from "./storage";

export function useProfile() {
  const [state, setState] = useState<StoredState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const read = () => {
      void getPlayerRepository()
        .load()
        .then((next) => {
          if (active) {
            setState(next);
            setReady(true);
          }
        });
    };
    read();
    window.addEventListener("bible-trivia-storage", read);
    window.addEventListener("storage", read);
    return () => {
      active = false;
      window.removeEventListener("bible-trivia-storage", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  const save = useCallback((next: StoredState) => {
    setState(next);
    savePlayerState(next);
  }, []);

  return { state, ready, save };
}
