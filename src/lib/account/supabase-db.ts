import type { SupabaseClient } from "@supabase/supabase-js";
import type { VerseMark } from "../bible/marks";
import type { StoredState } from "../storage";
import {
  assertReferenceOnly,
  markToRow,
  profileToRow,
  questionsToRows,
  rowToMark,
  rowToState,
  type ProfileRow,
  type QuestionRow,
  type VerseMarkRow,
} from "./rows";

type Result<T> = { data: T | null; error: { message: string } | null };

export interface AccountQuery {
  select(columns?: string): AccountQuery;
  eq(column: string, value: string): AccountQuery;
  maybeSingle(): Promise<Result<ProfileRow>>;
  upsert(values: unknown): Promise<{ error: { message: string } | null }>;
  delete(): AccountQuery;
  then<TResult1 = { data: unknown; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
}

export interface AccountClient {
  from(table: "profiles" | "question_progress" | "verse_marks"): AccountQuery;
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, label: string): T | null {
  if (result.error) throw new Error(result.error.message || label);
  return result.data;
}

export function createSupabasePlayerRepository(client: AccountClient | SupabaseClient, userId: string) {
  const db = client as AccountClient;
  return {
    kind: "supabase" as const,
    async load(): Promise<StoredState | null> {
      const profileResult = await db.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      const profile = unwrap(profileResult, "Could not load the account.");
      if (!profile) return null;
      const questionsResult = await db.from("question_progress").select("*").eq("user_id", userId);
      const questions = (unwrap(questionsResult, "Could not load question progress.") ?? []) as QuestionRow[];
      return rowToState(profile, questions);
    },
    async save(state: StoredState): Promise<void> {
      const profile = profileToRow(userId, state);
      const saved = await db.from("profiles").upsert(profile);
      if (saved.error) throw new Error(saved.error.message);
      const removed = await db.from("question_progress").delete().eq("user_id", userId);
      if (removed.error) throw new Error(removed.error.message);
      const rows = questionsToRows(userId, state.progress);
      if (rows.length === 0) return;
      const written = await db.from("question_progress").upsert(rows);
      if (written.error) throw new Error(written.error.message);
    },
    async loadMarks(): Promise<VerseMark[]> {
      const result = await db.from("verse_marks").select("*").eq("user_id", userId);
      const rows = (unwrap(result, "Could not load notes.") ?? []) as VerseMarkRow[];
      return rows.flatMap((row) => {
        const mark = rowToMark(row);
        return mark ? [mark] : [];
      });
    },
    async saveMarks(marks: VerseMark[]): Promise<void> {
      const removed = await db.from("verse_marks").delete().eq("user_id", userId);
      if (removed.error) throw new Error(removed.error.message);
      if (marks.length === 0) return;
      const rows = marks.map((mark) => {
        const row = markToRow(userId, mark);
        assertReferenceOnly(row);
        return row;
      });
      const written = await db.from("verse_marks").upsert(rows);
      if (written.error) throw new Error(written.error.message);
    },
  };
}
