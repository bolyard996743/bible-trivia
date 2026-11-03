"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AgeGroup, MascotId } from "@/lib/game/types";
import {
  parsePreview,
  previewQuery,
  tabFromPath,
  visibleTabs,
  withPreview,
  type MockupPreview,
  type PlayerState,
} from "@/lib/mockup/preview";

type PreviewApi = {
  preview: MockupPreview;
  href: (path: string) => string;
  setMascot: (mascot: MascotId) => void;
  setPlayer: (player: PlayerState) => void;
  setDemographic: (demographic: AgeGroup) => void;
};

const PreviewContext = createContext<PreviewApi | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const preview = useMemo(() => parsePreview(params), [params]);

  const replace = useCallback(
    (next: MockupPreview) => {
      const tab = tabFromPath(pathname);
      const dest = tab && tab !== "play" && !visibleTabs(next.player).includes(tab) ? "/mockup/home" : pathname;
      router.replace(`${dest}?${previewQuery(next)}`, { scroll: false });
    },
    [pathname, router],
  );

  const api = useMemo<PreviewApi>(
    () => ({
      preview,
      href: (path) => withPreview(path, preview),
      setMascot: (mascot) => replace({ ...preview, mascot }),
      setPlayer: (player) => replace({ ...preview, player }),
      setDemographic: (demographic) => replace({ ...preview, demographic }),
    }),
    [preview, replace],
  );

  return <PreviewContext.Provider value={api}>{children}</PreviewContext.Provider>;
}

export function usePreview(): PreviewApi {
  const value = useContext(PreviewContext);
  if (!value) throw new Error("usePreview must be used inside the mockup preview");
  return value;
}
