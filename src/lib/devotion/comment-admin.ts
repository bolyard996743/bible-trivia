/** Comma-separated user ids or emails. Nothing is hard-coded. */
export function isCommentAdmin(input: { userId: string; email: string | null | undefined }): boolean {
  const allowed = new Set(
    (process.env.COMMENT_ADMINS ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0),
  );
  if (allowed.size === 0) return false;
  if (allowed.has(input.userId.toLowerCase())) return true;
  if (input.email && allowed.has(input.email.toLowerCase())) return true;
  return false;
}
