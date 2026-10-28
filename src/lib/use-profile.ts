"use client";

import { useCallback, useEffect, useState } from "react";
import { loadState, saveState, type StoredState } from "./storage";

export function useProfile() {
  const [state, setState] = useState<StoredState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => setState(loadState());
    read();
    setReady(true);
    window.addEventListener("bible-trivia-storage", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("bible-trivia-storage", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  const save = useCallback((next: StoredState) => {
    saveState(next);
    setState(next);
  }, []);

  return { state, ready, save };
}
