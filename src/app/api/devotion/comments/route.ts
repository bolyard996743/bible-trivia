import { getUserClient } from "@/lib/account/user-client";
import { commentFixturesAllowed, publicCommentFixtures } from "@/lib/devotion/comment-fixtures";
import { reviewComment } from "@/lib/devotion/comment-filter";
import {
  asPublicComment,
  bearerToken,
  commentFailureMessage,
  privateJson,
  schemaMissing,
} from "@/lib/devotion/comment-http";
import { COMMENT_CLOSED_MESSAGE, COMMENT_RATE_MESSAGE, withinCommentRateLimit } from "@/lib/devotion/comment-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DEVOTION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMMENT_TOO_MANY = 99;

async function player(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  const client = getUserClient(token);
  if (!client) return null;
  const userResult = await client.auth.getUser(token);
  if (userResult.error || !userResult.data.user) return null;
  return { client, userId: userResult.data.user.id };
}

export async function GET(request: Request) {
  if (commentFixturesAllowed(request)) {
    return privateJson({
      ok: true,
      available: true,
      signedIn: true,
      canPost: true,
      comments: publicCommentFixtures,
    });
  }
  const session = await player(request);
  if (!session) return privateJson({ ok: false, signedIn: false }, 401);
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!DATE.test(date)) return privateJson({ ok: false, message: "That day isn't available." }, 400);
  const [listed, mayWrite] = await Promise.all([
    session.client.rpc("devotion_comments_for_date", { for_date: date }),
    session.client.rpc("devotion_comment_may_write"),
  ]);
  if (schemaMissing(listed.error) || schemaMissing(mayWrite.error)) {
    return privateJson({ ok: true, available: false, signedIn: true });
  }
  if (listed.error || mayWrite.error) return privateJson({ ok: true, available: false, signedIn: true });
  const comments = (Array.isArray(listed.data) ? listed.data : []).flatMap((row) => {
    const comment = asPublicComment(row);
    return comment ? [comment] : [];
  });
  return privateJson({
    ok: true,
    available: true,
    signedIn: true,
    canPost: mayWrite.data === true,
    comments,
  });
}

export async function POST(request: Request) {
  if (commentFixturesAllowed(request)) {
    return privateJson({ ok: true, available: true, comment: publicCommentFixtures[1] });
  }
  const session = await player(request);
  if (!session) return privateJson({ ok: false, signedIn: false }, 401);
  let payload: {
    action?: unknown;
    devotionId?: unknown;
    devotionDate?: unknown;
    body?: unknown;
    id?: unknown;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return privateJson({ ok: false, message: "Please try that comment again." }, 400);
  }

  if (payload.action === "delete" || payload.action === "report") {
    const id = typeof payload.id === "string" ? payload.id : "";
    if (!id) return privateJson({ ok: false, message: "That comment isn't available." }, 400);
    const result =
      payload.action === "delete"
        ? await session.client.from("devotion_comments").delete().eq("id", id).eq("user_id", session.userId)
        : await session.client.from("devotion_comment_reports").insert({
            comment_id: id,
            reporter_id: session.userId,
          });
    if (schemaMissing(result.error)) return privateJson({ ok: true, available: false });
    if (result.error && result.error.code !== "23505") {
      return privateJson({ ok: false, message: "Please try that again." }, 400);
    }
    return privateJson({ ok: true, available: true });
  }

  const devotionId = typeof payload.devotionId === "string" ? payload.devotionId : "";
  const devotionDate = typeof payload.devotionDate === "string" ? payload.devotionDate : "";
  const body = typeof payload.body === "string" ? payload.body : "";
  if (!DEVOTION_ID.test(devotionId) || !DATE.test(devotionDate)) {
    return privateJson({ ok: false, message: "That day isn't available." }, 400);
  }
  const review = reviewComment(body);
  if (!review.ok) return privateJson({ ok: false, message: review.message }, 400);
  const mayWrite = await session.client.rpc("devotion_comment_may_write");
  if (schemaMissing(mayWrite.error)) return privateJson({ ok: true, available: false });
  if (mayWrite.error || mayWrite.data !== true) {
    return privateJson({ ok: false, message: COMMENT_CLOSED_MESSAGE }, 403);
  }
  const count = await session.client.rpc("devotion_comment_count_today");
  if (!schemaMissing(count.error) && !withinCommentRateLimit(typeof count.data === "number" ? count.data : COMMENT_TOO_MANY)) {
    return privateJson({ ok: false, message: COMMENT_RATE_MESSAGE }, 429);
  }
  const inserted = await session.client
    .from("devotion_comments")
    .insert({
      user_id: session.userId,
      devotion_id: devotionId,
      devotion_date: devotionDate,
      body: review.body,
    })
    .select("id, body, created_at")
    .single();
  if (schemaMissing(inserted.error)) return privateJson({ ok: true, available: false });
  if (inserted.error || !inserted.data) {
    return privateJson({ ok: false, message: commentFailureMessage(inserted.error) }, 400);
  }
  return privateJson({ ok: true, available: true });
}
