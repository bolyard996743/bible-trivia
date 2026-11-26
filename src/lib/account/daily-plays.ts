import { isDayKey } from "@/lib/play/daily-streak";

/** Best-effort log for a signed-in player. Guests, children, and a missing table stay on the device copy. */
export async function rememberPlayedDay(day: string): Promise<void> {
  if (!isDayKey(day)) return;
  try {
    const { getSupabaseBrowserClient, isSupabaseConfigured } = await import("./supabase");
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase || typeof supabase.from !== "function") return;
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user.id;
    if (!userId) return;
    await supabase.from("daily_plays").upsert({ user_id: userId, played_on: day }, { onConflict: "user_id,played_on" });
  } catch {
    // The migration is applied later. The device copy still has the day.
  }
}

export async function loadPlayedDays(): Promise<string[] | null> {
  try {
    const { getSupabaseBrowserClient, isSupabaseConfigured } = await import("./supabase");
    if (!isSupabaseConfigured()) return null;
    const supabase = getSupabaseBrowserClient();
    if (!supabase || typeof supabase.from !== "function") return null;
    const session = await supabase.auth.getSession();
    if (!session.data.session?.user.id) return null;
    const result = await supabase.from("daily_plays").select("played_on");
    if (result.error || !Array.isArray(result.data)) return null;
    const days: string[] = [];
    for (const row of result.data) {
      const played = row && typeof row === "object" ? (row as { played_on?: unknown }).played_on : null;
      if (typeof played === "string" && isDayKey(played)) days.push(played);
    }
    return days;
  } catch {
    return null;
  }
}
