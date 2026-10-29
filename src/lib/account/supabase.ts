import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authCallbackUrl } from "../site-url";

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Anon key only. There is no service-role client. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (typeof window === "undefined") return null;
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      },
    );
  }
  return browserClient;
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
  username: string;
}): Promise<{ needsConfirmation: boolean }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Sign-in is not configured.");
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { username: input.username },
      emailRedirectTo: authCallbackUrl(),
    },
  });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

export async function signInWithPassword(input: { email: string; password: string }): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Sign-in is not configured.");
  const { error } = await supabase.auth.signInWithPassword(input);
  if (error) throw error;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Sign-in is not configured.");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authCallbackUrl(),
  });
  if (error) throw error;
}

export async function createProfileForNewAccount(input: {
  username: string;
  ageGroup: "teen" | "adult" | "older";
  birthDate: string;
  mascot?: "judah" | "agnes" | "shalom" | "zion" | "hunter";
}): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;
  const existing = await supabase.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  if (existing.data) return;
  const { error } = await supabase.from("profiles").insert({
    user_id: userId,
    username: input.username,
    age_group: input.ageGroup,
    birth_date: input.birthDate,
    mascot: input.mascot ?? "judah",
    points: 0,
  });
  if (error) throw error;
}

/**
 * Google can be added later with supabase.auth.signInWithOAuth({ provider: "google" })
 * and redirectTo: authCallbackUrl(). It is intentionally not wired up.
 */
export async function signOut(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}
