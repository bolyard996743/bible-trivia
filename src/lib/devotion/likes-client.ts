import { getSupabaseBrowserClient } from "@/lib/account/supabase";

export type LikeRead = { available: true; count: number; liked: boolean } | { available: false };

function asCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Math.max(0, Math.floor(Number(value)));
  }
  return null;
}

/** Count for the Chicago date. Hides the number when the table or function is not there yet. */
export async function readDevotionLikes(devotionDate: string): Promise<LikeRead> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { available: false };
  try {
    const countResult = await supabase.rpc("devotion_like_count", { for_date: devotionDate });
    if (countResult.error) return { available: false };
    const count = asCount(countResult.data);
    if (count === null) return { available: false };
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return { available: true, count, liked: false };
    const mine = await supabase
      .from("devotion_likes")
      .select("devotion_date")
      .eq("user_id", userData.user.id)
      .eq("devotion_date", devotionDate)
      .maybeSingle();
    if (mine.error) return { available: true, count, liked: false };
    return { available: true, count, liked: Boolean(mine.data) };
  } catch {
    return { available: false };
  }
}

export async function writeDevotionLike(input: {
  devotionId: string;
  devotionDate: string;
  like: boolean;
}): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return false;
    if (input.like) {
      const { error } = await supabase.from("devotion_likes").insert({
        user_id: userData.user.id,
        devotion_id: input.devotionId,
        devotion_date: input.devotionDate,
      });
      if (!error) return true;
      return error.code === "23505";
    }
    const { error } = await supabase
      .from("devotion_likes")
      .delete()
      .eq("user_id", userData.user.id)
      .eq("devotion_date", input.devotionDate);
    return !error;
  } catch {
    return false;
  }
}
