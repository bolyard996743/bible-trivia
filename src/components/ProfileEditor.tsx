"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MascotMark } from "@/components/MascotMark";
import { mascotLineAudioSrc, pickMascotLine } from "@/lib/game";
import { AGE_GROUPS, AGE_LABELS, MASCOT_IDS, MASCOTS, type AgeGroup, type MascotId, type MascotLine } from "@/lib/game/types";
import { createState, saveState } from "@/lib/storage";
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
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [mascot, setMascot] = useState<MascotId | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [greeting, setGreeting] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  if (ready && !hydrated) {
    setHydrated(true);
    if (state) {
      setAgeGroup(state.ageGroup);
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
    if (mode === "settings" && state) {
      saveState({ ...state, ageGroup, mascot, soundOn });
      router.push(state.placementComplete ? "/home" : "/placement");
      return;
    }
    const next = createState(ageGroup, mascot);
    next.soundOn = soundOn;
    saveState(next);
    router.push("/placement");
  }

  if (!ready) return <p className="text-lg text-ink-soft">Opening…</p>;

  return (
    <form onSubmit={save} className="grid gap-8">
      <div className="grid gap-3">
        <h1 className="text-3xl font-semibold text-grove-deep">
          {mode === "setup" ? "Who is learning today?" : "Settings"}
        </h1>
        <p className="text-lg text-ink">
          {mode === "setup"
            ? "Pick an age group so the wording fits, and a guide who will talk you through the verses. You can change both later."
            : "Change your age group, your guide, or the sound. Your place on the path stays put."}
        </p>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-xl font-semibold">Age group</legend>
        {AGE_GROUPS.map((age) => (
          <label key={age} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-lg">
            <input
              type="radio"
              name="age"
              className="h-5 w-5"
              checked={ageGroup === age}
              onChange={() => setAgeGroup(age)}
            />
            <span>
              <span className="font-semibold">{AGE_LABELS[age].title}</span>
              <span className="mt-0.5 block text-base text-ink-soft">{AGE_LABELS[age].detail}</span>
            </span>
          </label>
        ))}
      </fieldset>

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
