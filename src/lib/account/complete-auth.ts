import { callbackFailureMessage } from "./auth-errors";
import { planAuthCallback } from "./auth-callback";
import { getSupabaseBrowserClient } from "./supabase";

export type AuthRedirectResult = { ok: true; next: string } | { ok: false; message: string };

/**
 * Turns a confirmation or reset link into a session.
 * A recovery session always continues to the update-password page.
 */
export async function completeAuthRedirect(search: string, hash: string): Promise<AuthRedirectResult> {
  const plan = planAuthCallback(search, hash);
  if (plan.kind === "error") return { ok: false, message: plan.message };

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, message: "Sign-in isn't set up on this copy yet." };

  let recovery = false;
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") recovery = true;
  });

  try {
    if (plan.kind === "exchange") {
      const exchanged = await supabase.auth.exchangeCodeForSession(plan.code);
      if (exchanged.error) {
        const existing = await supabase.auth.getSession();
        if (!existing.data.session) return { ok: false, message: callbackFailureMessage(exchanged.error) };
      }
    } else if (plan.kind === "verify") {
      const verified = await supabase.auth.verifyOtp({ token_hash: plan.tokenHash, type: plan.otpType });
      if (verified.error) return { ok: false, message: callbackFailureMessage(verified.error) };
    }
    const next = recovery ? "/auth/update-password" : plan.next;
    return { ok: true, next };
  } catch (error) {
    return { ok: false, message: callbackFailureMessage(error) };
  } finally {
    data.subscription.unsubscribe();
  }
}
