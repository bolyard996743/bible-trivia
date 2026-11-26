"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AgeGate } from "@/components/AgeGate";
import { BirthDatePrompt } from "@/components/BirthDatePrompt";
import { MainNav } from "@/components/MainNav";
import { SiteLogo } from "@/components/SiteLogo";
import { ThemeSync } from "@/components/ThemeSync";
import { Turn13Prompt } from "@/components/Turn13Prompt";
import { UsernamePrompt } from "@/components/UsernamePrompt";
import { useAgeGate } from "@/lib/account/use-access";
import { useProfile } from "@/lib/use-profile";
import { savePlayerState } from "@/lib/account/repository";
import { skipsAgeGate } from "@/lib/shell-routes";
import { SiteFooter } from "@/components/SiteFooter";
import { usePathname } from "next/navigation";

export function Shell({ children }: { children: ReactNode }) {
  const { state, ready } = useProfile();
  const gate = useAgeGate();
  const pathname = usePathname();
  const openWithoutBirthday = skipsAgeGate(pathname || "/");

  function toggleSound() {
    if (!state) return;
    savePlayerState({ ...state, soundOn: !state.soundOn });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl min-w-0 flex-col px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6">
      <ThemeSync />
      <header className="site-header mb-6 flex flex-nowrap items-center justify-between gap-3">
        <Link href={state?.placementComplete ? "/home" : "/"} className="inline-flex min-w-0 items-center">
          <SiteLogo />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {ready && state ? (
            <button
              type="button"
              role="switch"
              aria-checked={state.soundOn}
              aria-label={state.soundOn ? "Sound on" : "Sound off"}
              onClick={toggleSound}
              className="rounded-full border border-line bg-card px-3 text-sm text-ink sm:px-4 sm:text-base"
            >
              Sound {state.soundOn ? "on" : "off"}
            </button>
          ) : null}
        </div>
      </header>
      {gate.ready && gate.value ? <MainNav /> : null}
      <main className="min-w-0 flex-1">
        {!gate.ready ? (
          <p className="text-lg text-ink-soft">Opening…</p>
        ) : gate.value || openWithoutBirthday ? (
          children
        ) : (
          <AgeGate />
        )}
      </main>
      <SiteFooter />
      {gate.value && !gate.value.under13 ? <BirthDatePrompt /> : null}
      {gate.value && !gate.value.under13 ? <UsernamePrompt /> : null}
      {gate.value ? <Turn13Prompt /> : null}
    </div>
  );
}
