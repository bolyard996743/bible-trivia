import { MASCOT_IDS, type MascotId } from "@/lib/game/types";
import { COMMENT_CLOSED_MESSAGE, COMMENT_RATE_MESSAGE } from "./comment-policy";
import type { PublicComment } from "./comment-types";

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match?.[1] ?? null;
}

export function privateJson(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

export function schemaMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

export function asMascot(value: unknown): MascotId {
  if (typeof value === "string" && (MASCOT_IDS as readonly string[]).includes(value)) return value as MascotId;
  return "judah";
}

export function asPublicComment(value: unknown): PublicComment | null {
  if (!value || typeof value !== "object") return null;
  const row = value as {
    id?: unknown;
    body?: unknown;
    created_at?: unknown;
    username?: unknown;
    mascot?: unknown;
    mine?: unknown;
  };
  if (typeof row.id !== "string" || typeof row.body !== "string") return null;
  const createdAt = typeof row.created_at === "string" ? row.created_at : "";
  const username = typeof row.username === "string" && row.username.trim() ? row.username.trim() : "Player";
  if (username.includes("@")) return null;
  return {
    id: row.id,
    body: row.body,
    createdAt,
    username,
    mascot: asMascot(row.mascot),
    mine: row.mine === true,
  };
}

export function commentFailureMessage(error: { message?: string } | null | undefined): string {
  const message = (error?.message ?? "").toLowerCase();
  if (message.includes("rate")) return COMMENT_RATE_MESSAGE;
  if (message.includes("closed")) return COMMENT_CLOSED_MESSAGE;
  if (message.includes("too long")) return "Please keep the comment to 280 characters.";
  return "Please reword that comment.";
}
