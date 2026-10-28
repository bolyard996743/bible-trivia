"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { canOfferAccount } from "@/lib/account/policy";
import { acceptMerge, declineMerge, getMergeOffer, subscribeAccount } from "@/lib/account/session";
import { getSupabaseBrowserClient, isSupabaseConfigured, signInWithEmail, signOut } from "@/lib/account/supabase";
import { useProfile } from "@/lib/use-profile";

export function AccountScreen() {
  const { state, ready } = useProfile();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [offer, setOffer] = useState(getMergeOffer());

  useEffect(() => subscribeAccount(() => setOffer(getMergeOffer())), []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setSignedInEmail(data.session?.user.email ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(session?.user.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return <p className="text-lg text-ink-soft">Opening…</p>;

  if (!state) {
    return (
      <section className="grid gap-4">
        <h1 className="text-3xl font-semibold text-grove-deep">Account</h1>
        <p className="text-lg text-ink">Choose an age group first. A child keeps progress on this device.</p>
        <Link href="/profile" className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          Choose an age group
        </Link>
      </section>
    );
  }

  if (!canOfferAccount(state.ageGroup)) {
    return (
      <section className="grid gap-4">
        <h1 className="text-3xl font-semibold text-grove-deep">On this device</h1>
        <p className="text-lg text-ink" data-testid="child-local-only">
          Progress for a child stays on this device. There is no account to sign in to.
        </p>
        <Link href={state ? "/home" : "/profile"} className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          Continue
        </Link>
      </section>
    );
  }

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      await signInWithEmail(email.trim());
      setMessage("Check your email for a sign-in link. You can keep playing as a guest until it arrives.");
    } catch {
      setMessage("We couldn't send the link. Check the email address and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="grid gap-5">
      <h1 className="text-3xl font-semibold text-grove-deep">Account</h1>
      <p className="text-lg text-ink">
        You can keep playing as a guest. An account saves your path, your streak, and your verse notes on this sign-in.
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
      {signedInEmail ? (
        <div className="grid gap-3 rounded-3xl border border-line bg-card p-5">
          <p className="text-lg text-ink">Signed in as {signedInEmail}.</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-2xl border border-line bg-parchment px-4 text-lg text-ink"
          >
            Sign out
          </button>
        </div>
      ) : null}
      {!isSupabaseConfigured() ? (
        <p className="text-lg text-ink-soft" data-testid="accounts-unconfigured">
          Sign-in isn&apos;t set up on this copy. You can keep playing as a guest. Progress stays on this device.
        </p>
      ) : null}
      {isSupabaseConfigured() && !signedInEmail ? (
        <form onSubmit={sendLink} className="grid gap-3">
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
          <button
            type="submit"
            disabled={sending}
            className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white disabled:opacity-60"
          >
            Email me a sign-in link
          </button>
        </form>
      ) : null}
      {message ? <p className="text-lg text-ink">{message}</p> : null}
      <Link href="/home" className="text-lg text-grove-deep">
        Continue as a guest
      </Link>
    </section>
  );
}
