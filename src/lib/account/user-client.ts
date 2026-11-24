import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** A short-lived client that acts as the signed-in player. The anon key only. */
export function getUserClient(accessToken: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon || !accessToken.trim()) return null;
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
