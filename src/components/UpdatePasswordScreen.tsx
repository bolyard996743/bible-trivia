"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  LINK_UNUSABLE,
  PASSWORD_RULE,
  PASSWORD_UPDATED,
  RESET_LINK_NEEDED,
  updatePasswordErrorMessage,
} from "@/lib/account/auth-errors";
import { completeAuthRedirect } from "@/lib/account/complete-auth";
import { getSupabaseBrowserClient, isSupabaseConfigured, updatePassword } from "@/lib/account/supabase";

export function UpdatePasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!isSupabaseConfigured()) {
        if (active) {
          setMessage("Sign-in isn't set up on this copy yet.");
          setChecking(false);
        }
        return;
      }
      const result = await completeAuthRedirect(window.location.search, window.location.hash);
      if (!active) return;
      if (!result.ok) {
        setMessage(result.message);
        setChecking(false);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const user = supabase ? (await supabase.auth.getUser()).data.user : null;
      if (!user) {
        setMessage(RESET_LINK_NEEDED);
        setChecking(false);
        return;
      }
      const clean = window.location.pathname;
      window.history.replaceState(null, "", clean);
      setReady(true);
      setChecking(false);
    })().catch(() => {
      if (!active) return;
      setMessage(LINK_UNUSABLE);
      setChecking(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (password.length < 8) {
      setMessage(PASSWORD_RULE);
      return;
    }
    if (password !== confirm) {
      setMessage("Type the same password in both boxes.");
      return;
    }
    setSending(true);
    try {
      await updatePassword(password);
      setSaved(true);
      setMessage(PASSWORD_UPDATED);
    } catch (error) {
      setMessage(updatePasswordErrorMessage(error));
    } finally {
      setSending(false);
    }
  }

  if (checking) return <p className="text-lg text-ink-soft">Opening your reset link…</p>;

  return (
    <section className="grid gap-5" data-testid="update-password">
      <h1 className="text-3xl font-semibold text-grove-deep">Choose a new password</h1>
      {ready && !saved ? (
        <form onSubmit={(event) => void submit(event)} className="grid gap-3">
          <label className="grid gap-2 text-lg" htmlFor="new-password">
            New password
            <input
              id="new-password"
              data-testid="new-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-14 w-full rounded-2xl border border-line bg-card px-4"
            />
            <span className="text-base text-ink-soft">At least 8 characters.</span>
          </label>
          <label className="grid gap-2 text-lg" htmlFor="confirm-password">
            Type it again
            <input
              id="confirm-password"
              data-testid="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="min-h-14 w-full rounded-2xl border border-line bg-card px-4"
            />
          </label>
          <button
            type="submit"
            data-testid="update-password-submit"
            disabled={sending}
            aria-busy={sending}
            className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white disabled:opacity-60"
          >
            {sending ? "Saving…" : "Save new password"}
          </button>
        </form>
      ) : null}
      {message ? (
        <p className="text-lg text-ink" role={saved ? "status" : "alert"} data-testid="update-password-message">
          {message}
        </p>
      ) : null}
      {saved ? (
        <Link href="/home" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          Continue
        </Link>
      ) : (
        <Link href="/auth/forgot-password" className="tap inline-flex items-center text-lg text-grove-deep">
          Request a new link
        </Link>
      )}
    </section>
  );
}
