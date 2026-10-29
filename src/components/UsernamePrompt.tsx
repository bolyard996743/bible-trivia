"use client";

import { useEffect, useState, type FormEvent } from "react";
import { signupErrorMessage, USERNAME_TAKEN } from "@/lib/account/auth-errors";
import { getSupabaseBrowserClient, isUsernameAvailable } from "@/lib/account/supabase";
import { useSignedIn } from "@/lib/account/use-access";
import { validateUsername } from "@/lib/account/username";
import { savePlayerState } from "@/lib/account/repository";
import { loadState } from "@/lib/storage";

export function UsernamePrompt() {
  const auth = useSignedIn();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!auth.ready || !auth.email) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id;
      if (!id || !active) return;
      const row = await supabase.from("profiles").select("username").eq("user_id", id).maybeSingle();
      if (!active || row.error || !row.data || row.data.username) return;
      setUserId(id);
    });
    return () => {
      active = false;
    };
  }, [auth.ready, auth.email]);

  if (!userId) return null;

  async function save(event: FormEvent) {
    event.preventDefault();
    const parsed = validateUsername(username);
    if (!parsed.ok) {
      setMessage(parsed.reason);
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      if (!(await isUsernameAvailable(parsed.username))) {
        setMessage(USERNAME_TAKEN);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const { error } = await supabase.from("profiles").update({ username: parsed.username }).eq("user_id", userId);
      if (error) {
        setMessage(signupErrorMessage(error));
        return;
      }
      const local = loadState();
      if (local) savePlayerState({ ...local, username: parsed.username });
      setUserId(null);
    } catch (error) {
      setMessage(signupErrorMessage(error));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center bg-parchment px-4 py-10" data-testid="username-prompt">
      <form onSubmit={(event) => void save(event)} className="grid w-full max-w-3xl gap-4">
        <h1 className="text-3xl font-semibold text-grove-deep">Choose a username</h1>
        <p className="text-lg text-ink">This is your name on the leaderboard. It cannot be changed later.</p>
        <label className="grid gap-2 text-lg" htmlFor="pick-username">
          Username
          <input
            id="pick-username"
            data-testid="pick-username"
            value={username}
            autoComplete="username"
            onChange={(event) => setUsername(event.target.value)}
            className="min-h-14 rounded-2xl border border-line bg-card px-4"
            required
          />
        </label>
        <button type="submit" disabled={sending} className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white disabled:opacity-60">
          Save username
        </button>
        {message ? <p className="text-lg text-ink">{message}</p> : null}
      </form>
    </div>
  );
}
