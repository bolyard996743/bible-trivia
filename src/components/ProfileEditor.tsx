"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MascotMark } from "@/components/MascotMark";
import { mascotLineAudioSrc, pickMascotLine } from "@/lib/game";
import { MASCOT_IDS, MASCOTS, type AgeGroup, type MascotId, type MascotLine } from "@/lib/game/types";
import { showCreateAccountLink } from "@/lib/account/policy";
import { savePlayerState } from "@/lib/account/repository";
import { signOut } from "@/lib/account/supabase";
import { useAgeGate, useSignedIn } from "@/lib/account/use-access";
import { createState } from "@/lib/storage";
import { useProfile } from "@/lib/use-profile";

export function ProfileEditor({
  lines,
  audioFiles,
  mode,
}: {
  lines: MascotLine[];
  audioFiles: string[];
  mode: "setup" | "settings";
}) {
  const router = useRouter();
  const { state, ready } = useProfile();
  const gate = useAgeGate();
  const auth = useSignedIn();
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [mascot, setMascot] = useState<MascotId | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  if (ready && gate.ready && !hydrated) {
    setHydrated(true);
    const locked = gate.value?.bracket ?? null;
    if (locked) setAgeGroup(locked);
    else if (state) setAgeGroup(state.ageGroup);
    if (state) {
      setMascot(state.mascot);
      setSoundOn(state.soundOn);
    }
  }

  const sample = useMemo(() => {
    if (!mascot || !ageGroup) return null;
    return pickMascotLine(lines, mascot, mode === "setup" ? "mascot_selected" : "welcome", ageGroup, {
      random: () => 0,
    });
  }, [ageGroup, lines, mascot, mode]);

  function hearGreeting() {
    if (!sample || !mascot) return;
    setGreeting(sample.text);
    if (!soundOn) return;
    const src = mascotLineAudioSrc(mascot, sample);
    if (!audioFiles.includes(src)) return;
    const audio = new Audio(src);
    void audio.play().catch(() => {});
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (!ageGroup || !mascot) return;
    if (ageGroup === "child") void signOut();
    if (mode === "settings" && state) {
      savePlayerState({ ...state, ageGroup, mascot, soundOn });
      router.push(state.placementComplete ? "/home" : "/placement");
      return;
    }
    const next = createState(ageGroup, mascot);
    next.soundOn = soundOn;
    savePlayerState(next);
    router.push("/placement");
  }

  if (!ready || !gate.ready || !auth.ready) return <p className="text-lg text-ink-soft">Opening…</p>;
  const offerAccount = showCreateAccountLink({
    signedIn: Boolean(auth.email),
    age: gate.value?.bracket ?? ageGroup,
  });

  return (
    <form onSubmit={save} className="grid gap-8">
      <div className="grid gap-3">
        <h1 className="text-3xl font-semibold text-grove-deep">
          {mode === "setup" ? "Choose a mentor" : "Settings"}
        </h1>
        <p className="text-lg text-ink">
          {mode === "setup"
            ? "Pick a guide who will talk you through the verses."
            : "You can change your guide or the sound. A username cannot be changed."}
        </p>
        {mode === "settings" && offerAccount ? (
          <Link
            href="/account?mode=sign-up"
            data-testid="create-account"
            className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
          >
            Create account
          </Link>
        ) : null}
      </div>

      {gate.value?.under13 ? (
        <p className="text-lg text-ink-soft" data-testid="child-local-only">
          Progress stays on this device. Accounts aren&apos;t used for children.
        </p>
      ) : null}

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-xl font-semibold">Choose a guide</legend>
        {MASCOT_IDS.map((id) => (
          <label key={id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-lg">
            <input
              type="radio"
              name="mascot"
              className="h-5 w-5"
              checked={mascot === id}
              onChange={() => {
                setMascot(id);
                setGreeting(null);
              }}
            />
            <MascotMark mascot={id} />
            <span>
              <span className="font-semibold">{MASCOTS[id].name}</span>
              <span className="mt-0.5 block text-base text-ink-soft">{MASCOTS[id].trait}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid gap-3 rounded-3xl border border-line bg-card p-4">
        <label className="flex items-center justify-between gap-3 text-lg">
          <span>Sound</span>
          <button
            type="button"
            role="switch"
            aria-checked={soundOn}
            onClick={() => setSoundOn((value) => !value)}
            className="rounded-full border border-line bg-parchment px-4"
          >
            {soundOn ? "On" : "Off"}
          </button>
        </label>
        <button
          type="button"
          onClick={hearGreeting}
          disabled={!sample}
          className="rounded-2xl border border-grove px-4 text-lg text-grove-deep disabled:opacity-50"
        >
          Hear a greeting
        </button>
        {greeting ? (
          <p className="text-lg text-ink" data-testid="greeting">
            {greeting}
          </p>
        ) : (
          <p className="text-base text-ink-soft">The words always show, even when there is no recording yet.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!ageGroup || !mascot}
        className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white disabled:opacity-50"
      >
        {mode === "setup" ? "Continue" : "Save"}
      </button>
    </form>
  );
}
