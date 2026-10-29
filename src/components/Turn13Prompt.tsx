"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  calendarToday,
  dismissAccountPrompt,
  loadAccountPromptDismissed,
  loadDeviceBirthDate,
  shouldOfferAccountPrompt,
} from "@/lib/account/age-gate";
import { useSignedIn } from "@/lib/account/use-access";

export function Turn13Prompt() {
  const auth = useSignedIn();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!auth.ready) return;
    const show =
      pathname !== "/account" &&
      shouldOfferAccountPrompt({
        birth: loadDeviceBirthDate(),
        today: calendarToday(),
        dismissed: loadAccountPromptDismissed(),
        signedIn: Boolean(auth.email),
      });
    setOpen(show);
  }, [auth.ready, auth.email, pathname]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-grove-deep/30 px-4 py-6 sm:items-center" data-testid="turn-13-prompt">
      <section className="grid w-full max-w-lg gap-4 rounded-3xl border border-line bg-parchment p-5">
        <h2 className="text-2xl font-semibold text-grove-deep">Create an account?</h2>
        <p className="text-lg text-ink">You can save the progress on this device to an account.</p>
        <Link
          href="/account?mode=sign-up"
          data-testid="turn-13-create"
          className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
        >
          Create account
        </Link>
        <button
          type="button"
          data-testid="turn-13-not-now"
          onClick={() => {
            dismissAccountPrompt();
            setOpen(false);
          }}
          className="rounded-2xl border border-line bg-card px-4 text-lg text-ink"
        >
          Not now
        </button>
      </section>
    </div>
  );
}
