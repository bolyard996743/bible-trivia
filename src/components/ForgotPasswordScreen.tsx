"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { passwordResetFeedback } from "@/lib/account/auth-errors";
import { isSupabaseConfigured, sendPasswordReset } from "@/lib/account/supabase";

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      await sendPasswordReset(email.trim());
      const feedback = passwordResetFeedback(null);
      setSent(true);
      setMessage(feedback.message);
    } catch (error) {
      const feedback = passwordResetFeedback(error);
      setSent(feedback.ok);
      setMessage(feedback.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="grid gap-5" data-testid="forgot-password">
      <h1 className="text-3xl font-semibold text-grove-deep">Forgot password?</h1>
      <p className="text-lg text-ink">
        Enter the email on your account. We will send a link that opens a page where you can choose a new password.
      </p>
      {!isSupabaseConfigured() ? (
        <p className="text-lg text-ink-soft">Sign-in isn&apos;t set up on this copy yet.</p>
      ) : null}
      <form onSubmit={(event) => void submit(event)} className="grid gap-3">
        <label className="grid gap-2 text-lg" htmlFor="reset-email">
          Email
          <input
            id="reset-email"
            data-testid="reset-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-14 w-full rounded-2xl border border-line bg-card px-4"
          />
        </label>
        <button
          type="submit"
          data-testid="reset-submit"
          disabled={sending || !isSupabaseConfigured()}
          aria-busy={sending}
          className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white disabled:opacity-60"
        >
          {sending ? "Sending…" : "Email me a reset link"}
        </button>
      </form>
      {message ? (
        <p className="text-lg text-ink" role={sent ? "status" : "alert"} data-testid="reset-message">
          {message}
        </p>
      ) : null}
      <Link href="/account?mode=sign-in" className="tap inline-flex items-center text-lg text-grove-deep">
        Back to sign in
      </Link>
    </section>
  );
}
