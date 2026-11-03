"use client";

import { useState, type ReactNode } from "react";
import { demographicLabel, guideName, playerLabel } from "@/lib/mockup/preview";
import { themeForMascot } from "@/lib/theme";
import { MockupControls } from "./MockupControls";
import { MockupTabs } from "./MockupTabs";
import { PreviewProvider, usePreview } from "./preview-context";
import { ProfileIcon } from "./ProfileIcon";

export function MockupShell({ children }: { children: ReactNode }) {
  return (
    <PreviewProvider>
      <MockupFrame>{children}</MockupFrame>
    </PreviewProvider>
  );
}

function MockupFrame({ children }: { children: ReactNode }) {
  const { preview } = usePreview();
  const [open, setOpen] = useState(false);
  const theme = themeForMascot(preview.mascot);

  return (
    <div className="min-h-dvh bg-[#d9d1c3]">
      <div
        data-theme={theme}
        data-testid="mockup-shell"
        data-mascot={preview.mascot}
        data-player={preview.player}
        data-demographic={preview.demographic}
        className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-parchment text-ink sm:shadow-[0_0_0_1px_rgba(36,28,20,0.08)]"
      >
        <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
          <div className="flex min-w-0 items-center gap-3">
            <ProfileIcon mascot={preview.mascot} labelled />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gold">Example data</p>
              <p className="truncate text-xl font-semibold text-grove-deep">{guideName(preview.mascot)}</p>
              <p className="truncate text-base text-ink-soft">
                {playerLabel(preview.player)} · {demographicLabel(preview.demographic)}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="mockup-controls-toggle"
            aria-expanded={open}
            aria-controls="mockup-controls"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-full border border-grove bg-card px-3 text-base font-semibold text-grove-deep"
          >
            Preview
          </button>
        </header>
        <main className="flex-1 px-4 pb-24">{children}</main>
        <MockupTabs />
        <MockupControls open={open} onClose={() => setOpen(false)} />
      </div>
    </div>
  );
}
