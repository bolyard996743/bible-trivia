"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { DEVICE_ONLY_PROGRESS_NOTE } from "@/lib/copy";
import { CONFIRM_EMAIL_MESSAGE, signupErrorMessage } from "@/lib/account/auth-errors";
import { showCreateAccountLink } from "@/lib/account/policy";
import { registerWithPassword } from "@/lib/account/register-account";
import { resendSignupConfirmation } from "@/lib/account/supabase";
import { useAgeGate, useSignedIn } from "@/lib/account/use-access";
import type { AgeGroup } from "@/lib/game/types";
import { useProfile } from "@/lib/use-profile";

export type SavePromptStatus = "form" | "confirm" | "ready";

export function shouldShowSavePrompt(input: {
  signedIn: boolean;
  dismissed: boolean;
  age: AgeGroup | null | undefined;
  status: SavePromptStatus;
}): boolean {
  if (input.status === "confirm" || input.status === "ready") return true;
  if (input.dismissed) return false;
  return showCreateAccountLink({ signedIn: input.signedIn, age: input.age });
}

export function SaveProgressPrompt() {
  const auth = useSignedIn();
  const gate = useAgeGate();
  const { state } = useProfile();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<SavePromptStatus>("form");
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  if (!auth.ready || !gate.ready) return null;

  const age = gate.value?.bracket ?? state?.ageGroup ?? null;
  if (!shouldShowSavePrompt({ signedIn: Boolean(auth.email), dismissed, age, status })) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    const result = await registerWithPassword({ email, password });
    setSending(false);
    if (result.status === "invalid") {
      setMessage(result.message);
      return;
    }
    if (result.status === "confirmation") {
      setConfirmEmail(result.email);
      setStatus("confirm");
      setMessage(null);
      return;
    }
    setStatus("ready");
    setMessage(null);
  }

  if (status === "confirm" && confirmEmail) {
    return (
      <section className="grid gap-4 rounded-3xl border border-line bg-card p-5" data-testid="save-progress">
        <h2 className="text-2xl font-semibold text-grove-deep">Check your email</h2>
        <p className="text-lg text-ink" data-testid="save-progress-confirm">
          {CONFIRM_EMAIL_MESSAGE} When you sign in, we will save the progress on this device.
        </p>
        <button
          type="button"
          data-testid="save-progress-resend"
          disabled={sending}
          onClick={() => {
            setSending(true);
            setMessage(null);
            void resendSignupConfirmation(confirmEmail)
              .then(() => setMessage("We sent another email."))
              .catch((error: unknown) => setMessage(signupErrorMessage(error)))
              .finally(() => setSending(false));
          }}
          className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white disabled:opacity-60"
        >
          Resend confirmation email
        </button>
        <Link href="/account?mode=sign-in" className="text-lg text-grove-deep">
          Already have an account? Sign in
        </Link>
        {message ? (
          <p className="text-lg text-ink" role="status" data-testid="save-progress-message">
            {message}
          </p>
        ) : null}
      </section>
    );
  }

  if (status === "ready") {
    return (
      <section className="grid gap-3 rounded-3xl border border-line bg-card p-5" data-testid="save-progress">
        <h2 className="text-2xl font-semibold text-grove-deep">Your account is ready</h2>
        <p className="text-lg text-ink" data-testid="save-progress-ready">
          Your progress is saved with your account.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-3xl border border-line bg-card p-5" data-testid="save-progress">
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold text-grove-deep">Save your progress</h2>
        <p className="text-lg text-ink">
          If you would like, add an email and a password. We will keep what you have done so far with your account. You can also keep going without one.
        </p>
      </div>
      <form onSubmit={(event) => void submit(event)} className="grid gap-3">
        <label className="grid gap-2 text-lg" htmlFor="save-progress-email">
          Email
          <input
            id="save-progress-email"
            data-testid="save-progress-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-14 w-full rounded-2xl border border-line bg-parchment px-4"
          />
        </label>
        <label className="grid gap-2 text-lg" htmlFor="save-progress-password">
          Password
          <input
            id="save-progress-password"
            data-testid="save-progress-password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-14 w-full rounded-2xl border border-line bg-parchment px-4"
          />
          <span className="text-base text-ink-soft">At least 8 characters.</span>
        </label>
        <button
          type="submit"
          data-testid="save-progress-submit"
          disabled={sending}
          className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white disabled:opacity-60"
        >
          Create account
        </button>
      </form>
      {message ? (
        <p className="text-lg text-ink" role="alert" data-testid="save-progress-message">
          {message}
        </p>
      ) : null}
      <div className="grid gap-3">
        <p className="text-lg text-ink" data-testid="save-progress-note">
          {DEVICE_ONLY_PROGRESS_NOTE}
        </p>
        <button
          type="button"
          data-testid="save-progress-skip"
          onClick={() => setDismissed(true)}
          className="rounded-2xl border border-line bg-parchment px-4 text-lg text-ink"
        >
          Not now
        </button>
      </div>
      <Link href="/account?mode=sign-in" data-testid="save-progress-sign-in" className="text-lg text-grove-deep">
        Already have an account? Sign in
      </Link>
    </section>
  );
}
