"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { MainNav } from "@/components/MainNav";
import { useProfile } from "@/lib/use-profile";
import { saveState } from "@/lib/storage";

export function Shell({ children }: { children: ReactNode }) {
  const { state, ready } = useProfile();

  function toggleSound() {
    if (!state) return;
    saveState({ ...state, soundOn: !state.soundOn });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-4 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link href={state?.placementComplete ? "/home" : "/"} className="tap inline-flex items-center text-xl font-semibold text-grove-deep">
          Bible Trivia
        </Link>
        <div className="flex items-center gap-2">
          {ready && state ? (
            <button
              type="button"
              role="switch"
              aria-checked={state.soundOn}
              aria-label={state.soundOn ? "Sound on" : "Sound off"}
              onClick={toggleSound}
              className="rounded-full border border-line bg-card px-4 text-base text-ink"
            >
              Sound {state.soundOn ? "on" : "off"}
            </button>
          ) : null}
        </div>
      </header>
      <MainNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
