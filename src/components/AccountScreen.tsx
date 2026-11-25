"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { accountModeHref, type AccountMode } from "@/lib/account/account-mode";
import { accountBirth, birthDateIso } from "@/lib/account/age-gate";
import {
  CONFIRM_EMAIL_MESSAGE,
  passwordResetFeedback,
  RESET_EMAIL_SENT,
  signInErrorMessage,
  signupErrorMessage,
} from "@/lib/account/auth-errors";
import { registerWithPassword } from "@/lib/account/register-account";
import { acceptMerge, declineMerge, getMergeOffer, subscribeAccount } from "@/lib/account/session";
import {
  createProfileForNewAccount,
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  resendSignupConfirmation,
  sendPasswordReset,
  signInWithPassword,
  signOut,
} from "@/lib/account/supabase";
import { useAgeGate, useSignedIn } from "@/lib/account/use-access";
import { useProfile } from "@/lib/use-profile";
import { AuthLegalNotice } from "@/components/AuthLegalNotice";

type Mode = AccountMode;

export function AccountScreen() {
  const { state, ready } = useProfile();
  const gate = useAgeGate();
  const auth = useSignedIn();
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [offer, setOffer] = useState(getMergeOffer());

  useEffect(() => subscribeAccount(() => setOffer(getMergeOffer())), []);
  useEffect(() => {
    const modeParam = new URLSearchParams(window.location.search).get("mode");
    if (modeParam === "sign-up" || modeParam === "reset" || modeParam === "sign-in") setMode(modeParam);
  }, []);

  function selectMode(next: Mode) {
    setMode(next);
    const href = accountModeHref(pathname || "/account", window.location.search, next);
    window.history.replaceState(null, "", href);
  }

  if (!ready || !gate.ready || !auth.ready) return <p className="text-lg text-ink-soft">Opening…</p>;

  const under13 = gate.value?.under13 || state?.ageGroup === "child";
  if (under13) {
    return (
      <section className="grid gap-4">
        <h1 className="text-3xl font-semibold text-grove-deep">On this device</h1>
        <p className="text-lg text-ink" data-testid="child-local-only">
          Your progress is saved on this device.
        </p>
        <Link href="/home" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          Continue
        </Link>
      </section>
    );
  }

  if (!gate.value && !state) {
    return (
      <section className="grid gap-4">
        <h1 className="text-3xl font-semibold text-grove-deep">Account</h1>
        <p className="text-lg text-ink">Tell us your birthday first.</p>
        <Link href="/" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          When is your birthday?
        </Link>
      </section>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      if (mode === "reset") {
        try {
          await sendPasswordReset(email.trim());
          setMessage(RESET_EMAIL_SENT);
        } catch (error) {
          setMessage(passwordResetFeedback(error).message);
        }
        return;
      }
      if (mode === "sign-up") {
        const result = await registerWithPassword({ email, password, username });
        if (result.status === "invalid") {
          setMessage(result.message);
          return;
        }
        if (result.status === "confirmation") {
          setConfirmEmail(result.email);
          setMessage(null);
          return;
        }
        setMessage("Your account is ready. Next, choose a mentor.");
        return;
      }
      if (password.length < 8) {
        setMessage("Use a password of at least 8 characters.");
        return;
      }
      await signInWithPassword({ email: email.trim(), password });
      const readyBirth = accountBirth();
      const meta = getSupabaseBrowserClient();
      const user = meta ? (await meta.auth.getUser()).data.user : null;
      const fromMeta = typeof user?.user_metadata?.username === "string" ? user.user_metadata.username : "";
      if (fromMeta && readyBirth) {
        await createProfileForNewAccount({
          username: fromMeta,
          ageGroup: readyBirth.age,
          birthDate: birthDateIso(readyBirth.birth),
        });
      }
      setMessage("You're signed in.");
    } catch (error) {
      setMessage(mode === "sign-in" ? signInErrorMessage(error) : signupErrorMessage(error));
    } finally {
      setSending(false);
    }
  }

  if (confirmEmail && !auth.email) {
    return (
      <section className="grid gap-4" data-testid="confirm-email">
        <h1 className="text-3xl font-semibold text-grove-deep">Check your email</h1>
        <p className="text-lg text-ink">{CONFIRM_EMAIL_MESSAGE}</p>
        <button
          type="button"
          data-testid="resend-confirmation"
          disabled={sending}
          onClick={() => {
            setSending(true);
            setMessage(null);
            void resendSignupConfirmation(confirmEmail)
              .then(() => setMessage("We sent another email."))
              .catch((error: unknown) => setMessage(signupErrorMessage(error)))
              .finally(() => setSending(false));
          }}
          aria-busy={sending}
          className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white disabled:opacity-60"
        >
          {sending ? "Sending…" : "Resend confirmation email"}
        </button>
        <button
          type="button"
          className="text-lg text-grove-deep"
          onClick={() => {
            setConfirmEmail(null);
            selectMode("sign-in");
          }}
        >
          Sign in
        </button>
        {message ? (
          <p className="text-lg text-ink" role="status">
            {message}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="grid gap-5">
      <h1 className="text-3xl font-semibold text-grove-deep">Account</h1>
      <p className="text-lg text-ink">
        An account keeps your path with you. You can also play on this device. A username is your name on the leaderboard, and it cannot be changed later.
      </p>
      {offer ? (
        <div className="grid gap-3 rounded-3xl border border-line bg-card p-5" data-testid="merge-offer">
          <p className="text-lg text-ink">
            Move this device&apos;s progress into your account? Nothing you have learned here will be dropped.
          </p>
          <button type="button" onClick={() => void acceptMerge()} className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
            Keep both
          </button>
          <button type="button" onClick={declineMerge} className="rounded-2xl border border-line bg-parchment px-4 text-lg text-ink">
            Not now
          </button>
        </div>
      ) : null}
      {auth.email ? (
        <div className="grid gap-3 rounded-3xl border border-line bg-card p-5">
          <p className="text-lg text-ink">Signed in as {auth.email}.</p>
          <Link href="/settings" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
            Choose a guide
          </Link>
          <button type="button" onClick={() => void signOut()} className="rounded-2xl border border-line bg-parchment px-4 text-lg text-ink">
            Sign out
          </button>
        </div>
      ) : null}
      {!isSupabaseConfigured() ? (
        <p className="text-lg text-ink-soft" data-testid="accounts-unconfigured">
          Sign-in isn&apos;t set up on this copy yet. Playing waits until an account can be created.
        </p>
      ) : null}
      {!auth.email ? (
        <form onSubmit={submit} className="grid gap-3">
          {mode === "sign-up" ? (
            <label className="grid gap-2 text-lg" htmlFor="account-username">
              Username
              <input
                id="account-username"
                data-testid="account-username"
                value={username}
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
                className="min-h-14 rounded-2xl border border-line bg-card px-4"
                required
              />
              <span className="text-base text-ink-soft" data-testid="username-permanent">
                Your username can&apos;t be changed later.
              </span>
            </label>
          ) : null}
          <label className="grid gap-2 text-lg" htmlFor="account-email">
            Email
            <input
              id="account-email"
              data-testid="account-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-14 rounded-2xl border border-line bg-card px-4"
            />
          </label>
          {mode !== "reset" ? (
            <label className="grid gap-2 text-lg" htmlFor="account-password">
              Password
              <input
                id="account-password"
                data-testid="account-password"
                type="password"
                required
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-14 rounded-2xl border border-line bg-card px-4"
              />
            </label>
          ) : null}
          <button
            type="submit"
            data-testid="account-submit"
            disabled={sending || !isSupabaseConfigured()}
            aria-busy={sending}
            className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white disabled:opacity-60"
          >
            {sending
              ? mode === "sign-up"
                ? "Creating account…"
                : mode === "reset"
                  ? "Sending…"
                  : "Signing in…"
              : mode === "sign-up"
                ? "Create account"
                : mode === "reset"
                  ? "Email me a reset link"
                  : "Sign in"}
          </button>
          {mode === "sign-up" ? <AuthLegalNotice /> : null}
        </form>
      ) : null}
      {!auth.email ? (
        <div className="flex flex-wrap gap-4 text-lg">
          {mode !== "sign-in" ? (
            <button type="button" className="text-grove-deep" onClick={() => selectMode("sign-in")}>
              Sign in
            </button>
          ) : null}
          {mode !== "sign-up" ? (
            <button type="button" className="text-grove-deep" onClick={() => selectMode("sign-up")}>
              Create account
            </button>
          ) : null}
          {mode === "sign-in" ? (
            <Link href="/auth/forgot-password" data-testid="forgot-password-link" className="tap inline-flex items-center text-grove-deep">
              Forgot password?
            </Link>
          ) : null}
        </div>
      ) : null}
      {message ? (
        <p className="text-lg text-ink" role="alert" data-testid="account-message">
          {message}
        </p>
      ) : null}
    </section>
  );
}
