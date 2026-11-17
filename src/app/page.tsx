"use client";

import Link from "next/link";
import { useState } from "react";
import { AgeGate } from "@/components/AgeGate";
import { beginShouldOfferPlayChoice, hasChosenLocalPlay } from "@/lib/account/age-gate";
import { useAgeGate, useSignedIn } from "@/lib/account/use-access";
import { useProfile } from "@/lib/use-profile";

export default function WelcomePage() {
  const { state, ready } = useProfile();
  const gate = useAgeGate();
  const auth = useSignedIn();
  const [choosing, setChoosing] = useState(false);
  const href = !state ? "/profile" : state.placementComplete ? "/home" : "/placement";
  const label = state?.placementComplete ? "Continue your path" : "Begin";
  const offerChoice =
    gate.ready &&
    auth.ready &&
    beginShouldOfferPlayChoice({
      under13: Boolean(gate.value?.under13),
      hasProfile: Boolean(state),
      signedIn: Boolean(auth.email),
      localPlay: hasChosenLocalPlay(),
    });

  if (choosing && offerChoice) return <AgeGate resume />;

  return (
    <section className="grid gap-6">
      <h1 className="text-4xl leading-tight font-semibold text-grove-deep">Noble Bereans</h1>
      <p className="text-lg text-ink-soft" data-testid="name-pronunciation">
        (NO-bul buh-REE-unz)
      </p>
      <p className="text-lg text-ink" data-testid="name-meaning">
        The Bereans checked the Scriptures every day to see what was true. (See Acts 17:11)
      </p>
      <p className="text-2xl leading-tight font-semibold text-grove-deep">A quiet place to learn the Bible, one question at a time.</p>
      <p className="text-lg text-ink">
        If you miss a question, we stop. Your guide reads a verse with you. There is no shame in learning.
      </p>
      {gate.ready ? (
        <p className="text-lg text-ink-soft" data-testid="landing-note">
          {gate.value?.under13
            ? "Your progress is saved on this device."
            : "Progress stays on this device until you create an account."}
        </p>
      ) : null}
      {ready && gate.ready && auth.ready ? (
        offerChoice ? (
          <button
            type="button"
            onClick={() => setChoosing(true)}
            className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-6 text-lg font-semibold text-white"
          >
            Begin
          </button>
        ) : (
          <Link href={href} className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-6 text-lg font-semibold text-white">
            {label}
          </Link>
        )
      ) : (
        <p className="text-lg text-ink-soft">Opening…</p>
      )}
    </section>
  );
}
