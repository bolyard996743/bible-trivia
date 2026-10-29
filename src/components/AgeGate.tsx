"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ageGateFromBirthDate,
  saveAgeGate,
  saveDeviceBirthDate,
  type CalendarDate,
} from "@/lib/account/age-gate";
import { BirthdayForm } from "@/components/BirthdayForm";

export function AgeGate() {
  const router = useRouter();
  const [date, setDate] = useState<CalendarDate | null>(null);
  const [warning, setWarning] = useState(false);

  function persist(chosen: CalendarDate) {
    saveDeviceBirthDate(chosen);
    saveAgeGate(ageGateFromBirthDate(chosen));
  }

  function choose(chosen: CalendarDate) {
    const gate = ageGateFromBirthDate(chosen);
    if (gate.under13) {
      persist(chosen);
      router.push("/profile");
      return;
    }
    setDate(chosen);
  }

  if (date && warning) {
    return (
      <section className="grid gap-5" data-testid="local-progress-warning">
        <h1 className="text-3xl font-semibold text-grove-deep">On this device</h1>
        <p className="text-lg text-ink">
          Progress is saved only on this device and can&apos;t be moved unless you create an account later.
        </p>
        <button
          type="button"
          data-testid="confirm-local-play"
          onClick={() => {
            persist(date);
            router.push("/profile");
          }}
          className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
        >
          Continue
        </button>
        <button type="button" onClick={() => setWarning(false)} className="rounded-2xl border border-line bg-card px-4 text-lg text-ink">
          Back
        </button>
      </section>
    );
  }

  if (date) {
    return (
      <section className="grid gap-5" data-testid="age-choice">
        <h1 className="text-3xl font-semibold text-grove-deep">How do you want to play?</h1>
        <button
          type="button"
          data-testid="choose-create-account"
          onClick={() => {
            persist(date);
            router.push("/account?mode=sign-up");
          }}
          className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
        >
          Create an account
        </button>
        <button
          type="button"
          onClick={() => {
            persist(date);
            router.push("/account");
          }}
          className="rounded-2xl border border-line bg-card px-4 text-lg text-ink"
        >
          Sign in
        </button>
        <button
          type="button"
          data-testid="play-without-account"
          onClick={() => setWarning(true)}
          className="rounded-2xl border border-line bg-card px-4 text-lg text-ink"
        >
          Play without an account
        </button>
      </section>
    );
  }

  return (
    <section className="grid gap-5" data-testid="age-gate">
      <p className="text-base tracking-wide text-gold uppercase">Before we begin</p>
      <h1 className="text-3xl font-semibold text-grove-deep">When is your birthday?</h1>
      <BirthdayForm onContinue={choose} />
    </section>
  );
}
