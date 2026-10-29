import { getSupabaseBrowserClient } from "./supabase";

/** Asks the database to award season points. The client does not send a total. */
export async function awardQuestionPoints(input: {
  questionId: string;
  missCount: number;
  seasonId: string;
}): Promise<number | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return null;
  const { data, error } = await supabase.rpc("award_question_points", {
    question_id: input.questionId,
    miss_count: input.missCount,
    season_id: input.seasonId,
  });
  if (error || typeof data !== "number") return null;
  return data;
}
