"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ageGroupFromBirthDate, birthDateIso, loadDeviceBirthDate, type DeviceBirth } from "@/lib/account/age-gate";
import { acceptMerge, declineMerge, getMergeOffer, subscribeAccount } from "@/lib/account/session";
import {
  createProfileForNewAccount,
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  sendPasswordReset,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from "@/lib/account/supabase";
import { useAgeGate, useSignedIn } from "@/lib/account/use-access";
import { validateUsername } from "@/lib/account/username";
import { useProfile } from "@/lib/use-profile";

type Mode = "sign-in" | "sign-up" | "reset";

function accountBirth(): { birth: DeviceBirth; age: "teen" | "adult" | "older" } | null {
  const birth = loadDeviceBirthDate();
  if (!birth) return null;
  const age = ageGroupFromBirthDate(birth);
  if (age !== "teen" && age !== "adult" && age !== "older") return null;
  return { birth, age };
}

export function AccountScreen() {
  const { state, ready } = useProfile();
  const gate = useAgeGate();
  const auth = useSignedIn();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [offer, setOffer] = useState(getMergeOffer());

  useEffect(() => subscribeAccount(() => setOffer(getMergeOffer())), []);
  useEffect(() => {
    const modeParam = new URLSearchParams(window.location.search).get("mode");
    if (modeParam === "sign-up" || modeParam === "reset" || modeParam === "sign-in") setMode(modeParam);
  }, []);

  if (!ready || !gate.ready || !auth.ready) return <p className="text-lg text-ink-soft">Opening…</p>;

  const under13 = gate.value?.under13 || state?.ageGroup === "child";
  if (under13) {
    return (
      <section className="grid gap-4">
        <h1 className="text-3xl font-semibold text-grove-deep">On this device</h1>
        <p className="text-lg text-ink" data-testid="child-local-only">
          Progress for a child stays on this device. There is no account to sign in to.
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
        await sendPasswordReset(email.trim());
        setMessage("Check your email for a link to choose a new password.");
        return;
      }
      if (password.length < 8) {
        setMessage("Use a password of at least 8 characters.");
        return;
      }
      if (mode === "sign-up") {
        const name = validateUsername(username);
        if (!name.ok) {
          setMessage(name.reason);
          return;
        }
        const readyBirth = accountBirth();
        if (!readyBirth) {
          setMessage("Enter your birthday before creating an account.");
          return;
        }
        const result = await signUpWithPassword({
          email: email.trim(),
          password,
          username: name.username,
        });
        if (result.needsConfirmation) {
          setMessage("Check your email to confirm the account, then sign in. Your username is saved with the sign-up.");
          setMode("sign-in");
          return;
        }
        await createProfileForNewAccount({
          username: name.username,
          ageGroup: readyBirth.age,
          birthDate: birthDateIso(readyBirth.birth),
        });
        setMessage("Your account is ready. Next, choose a mentor.");
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
    } catch {
      setMessage("We couldn't finish that. Check the email and password, and try again.");
    } finally {
      setSending(false);
    }
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
          <Link href="/profile" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
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
          <button type="submit" disabled={sending || !isSupabaseConfigured()} className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white disabled:opacity-60">
            {mode === "sign-up" ? "Create account" : mode === "reset" ? "Email me a reset link" : "Sign in"}
          </button>
        </form>
      ) : null}
      {!auth.email ? (
        <div className="flex flex-wrap gap-4 text-lg">
          {mode !== "sign-in" ? (
            <button type="button" className="text-grove-deep" onClick={() => setMode("sign-in")}>
              Sign in
            </button>
          ) : null}
          {mode !== "sign-up" ? (
            <button type="button" className="text-grove-deep" onClick={() => setMode("sign-up")}>
              Create account
            </button>
          ) : null}
          {mode !== "reset" ? (
            <button type="button" className="text-grove-deep" onClick={() => setMode("reset")}>
              Reset password
            </button>
          ) : null}
        </div>
      ) : null}
      {message ? <p className="text-lg text-ink">{message}</p> : null}
    </section>
  );
}
