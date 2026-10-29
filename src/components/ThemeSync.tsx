"use client";

import { useLayoutEffect } from "react";
import { applyTheme, themeForMascot } from "@/lib/theme";
import { useProfile } from "@/lib/use-profile";

export function ThemeSync() {
  const { state } = useProfile();
  const theme = themeForMascot(state?.mascot);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return null;
}
