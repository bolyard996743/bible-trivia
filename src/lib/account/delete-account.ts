import { schemaMissing } from "@/lib/devotion/comment-http";
import {
  DELETE_ACCOUNT_SIGNED_OUT,
  DELETE_ACCOUNT_UNAVAILABLE,
} from "@/lib/account/delete-account-copy";

export type DeleteAccountResult = { ok: true } | { ok: false; message: string };

type DbError = { code?: string; message?: string } | null;

export type AccountDeletionDb = {
  listIds(
    table: string,
    column: string,
    value: string,
  ): Promise<{ ids: string[]; error: DbError }>;
  deleteEq(table: string, column: string, value: string): Promise<{ error: DbError }>;
  deleteIn(table: string, column: string, values: string[]): Promise<{ error: DbError }>;
};

/**
 * Owned rows, in an order that stays safe even if a foreign key does not cascade.
 * Reports that point at this player's comments go first. The profile is last.
 * Leaderboard rows are the profile itself. Badges live on the profile.
 */
export const ACCOUNT_ROW_DELETES = [
  { table: "devotion_comment_reports", column: "reporter_id" },
  { table: "devotion_comments", column: "user_id" },
  { table: "devotion_likes", column: "user_id" },
  { table: "devotion_comment_bans", column: "user_id" },
  { table: "verse_marks", column: "user_id" },
  { table: "question_awards", column: "user_id" },
  { table: "question_progress", column: "user_id" },
  { table: "stage_progress", column: "user_id" },
  { table: "profiles", column: "user_id" },
] as const;

function failed(error: DbError): boolean {
  return Boolean(error) && !schemaMissing(error);
}

/** Deletes every row owned by this auth user. A missing table is skipped. */
export async function removeOwnedAccountRows(userId: string, db: AccountDeletionDb): Promise<void> {
  const comments = await db.listIds("devotion_comments", "user_id", userId);
  if (failed(comments.error)) throw new Error("row delete failed");
  if (comments.ids.length > 0) {
    const onComments = await db.deleteIn("devotion_comment_reports", "comment_id", comments.ids);
    if (failed(onComments.error)) throw new Error("row delete failed");
  }
  for (const step of ACCOUNT_ROW_DELETES) {
    const removed = await db.deleteEq(step.table, step.column, userId);
    if (failed(removed.error)) throw new Error("row delete failed");
  }
}

/**
 * Deletes the signed-in account. The id comes only from readUser, which must
 * call auth.getUser() with the session. clientUserId is never used.
 */
export async function deleteSignedInAccount(input: {
  accessToken: string | null | undefined;
  clientUserId?: string | null;
  readUser: (accessToken: string) => Promise<{ id: string } | null>;
  removeOwnedRows: (userId: string) => Promise<void>;
  deleteAuthUser: (userId: string) => Promise<void>;
}): Promise<DeleteAccountResult> {
  void input.clientUserId;
  try {
    const token = input.accessToken?.trim() ?? "";
    if (!token) return { ok: false, message: DELETE_ACCOUNT_SIGNED_OUT };
    const user = await input.readUser(token);
    if (!user?.id) return { ok: false, message: DELETE_ACCOUNT_SIGNED_OUT };
    await input.removeOwnedRows(user.id);
    await input.deleteAuthUser(user.id);
    return { ok: true };
  } catch {
    return { ok: false, message: DELETE_ACCOUNT_UNAVAILABLE };
  }
}
