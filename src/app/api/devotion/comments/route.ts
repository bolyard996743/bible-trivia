import { getAnonClient, getUserClient } from "@/lib/account/user-client";
import { commentFixturesAllowed, publicCommentFixtures } from "@/lib/devotion/comment-fixtures";
import { reviewComment } from "@/lib/devotion/comment-filter";
import {
  asPublicComment,
  bearerToken,
  commentFailureMessage,
  privateJson,
  schemaMissing,
} from "@/lib/devotion/comment-http";
import {
  chicagoToday,
  commentAccess,
  commentInsertDecision,
  COMMENT_CLOSED_MESSAGE,
  COMMENT_RATE_MESSAGE,
  withinCommentRateLimit,
} from "@/lib/devotion/comment-policy";

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
      needsBirthDate: false,
      under13: false,
      comments: publicCommentFixtures,
    });
  }
  const session = await player(request);
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!DATE.test(date)) return privateJson({ ok: false, message: "That day isn't available." }, 400);
  const reader = session?.client ?? getAnonClient();
  if (!reader) return privateJson({ ok: true, available: false, signedIn: false, comments: [] });
  const listed = await reader.rpc("devotion_comments_for_date", { for_date: date });
  if (schemaMissing(listed.error)) {
    return privateJson({ ok: true, available: false, signedIn: Boolean(session), comments: [] });
  }
  if (listed.error) return privateJson({ ok: true, available: false, signedIn: Boolean(session), comments: [] });
  const comments = (Array.isArray(listed.data) ? listed.data : []).flatMap((row) => {
    const comment = asPublicComment(row);
    return comment ? [comment] : [];
  });
  if (!session) {
    return privateJson({
      ok: true,
      available: true,
      signedIn: false,
      canPost: false,
      needsBirthDate: false,
      under13: false,
      comments: comments.map((comment) => ({ ...comment, mine: false })),
    });
  }
  const mayWrite = await session.client.rpc("devotion_comment_may_write");
  if (schemaMissing(mayWrite.error) || mayWrite.error) {
    return privateJson({ ok: true, available: false, signedIn: true, comments });
  }
  const profile = await session.client
    .from("profiles")
    .select("birth_date, comment_birth_year, comment_birth_month")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (schemaMissing(profile.error)) return privateJson({ ok: true, available: false, signedIn: true });
  const access = commentAccess(
    {
      signedIn: true,
      birthDate: typeof profile.data?.birth_date === "string" ? profile.data.birth_date : null,
      birthYear: typeof profile.data?.comment_birth_year === "number" ? profile.data.comment_birth_year : null,
      birthMonth: typeof profile.data?.comment_birth_month === "number" ? profile.data.comment_birth_month : null,
    },
    chicagoToday(),
  );
  const canPost = mayWrite.data === true;
  return privateJson({
    ok: true,
    available: true,
    signedIn: true,
    canPost,
    needsBirthDate: access.needsBirthDate,
    under13: access.under13 && !canPost,
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
    year?: unknown;
    month?: unknown;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return privateJson({ ok: false, message: "Please try that comment again." }, 400);
  }

  if (payload.action === "save-birth") {
    const year = Number(payload.year);
    const month = Number(payload.month);
    const today = chicagoToday();
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || year < 1900 || year > today.year) {
      return privateJson({ ok: false, message: "Choose a birth month and year." }, 400);
    }
    const existing = await session.client
      .from("profiles")
      .select("birth_date, comment_birth_year, comment_birth_month")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (schemaMissing(existing.error)) return privateJson({ ok: true, available: false });
    if (existing.error || !existing.data) return privateJson({ ok: false, message: COMMENT_CLOSED_MESSAGE }, 400);
    const already =
      existing.data.birth_date != null ||
      existing.data.comment_birth_year != null ||
      existing.data.comment_birth_month != null;
    if (already) return privateJson({ ok: false, message: "That birth date is already saved." }, 400);
    const saved = await session.client
      .from("profiles")
      .update({ comment_birth_year: year, comment_birth_month: month })
      .eq("user_id", session.userId)
      .is("comment_birth_year", null)
      .is("birth_date", null);
    if (schemaMissing(saved.error)) return privateJson({ ok: true, available: false });
    if (saved.error) return privateJson({ ok: false, message: "That birth date is already saved." }, 400);
    const access = commentAccess({ signedIn: true, birthYear: year, birthMonth: month }, today);
    return privateJson({ ok: true, available: true, ...access });
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
  const profile = await session.client
    .from("profiles")
    .select("birth_date, comment_birth_year, comment_birth_month")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (schemaMissing(profile.error)) return privateJson({ ok: true, available: false });
  const countPreview = await session.client.rpc("devotion_comment_count_today");
  const decision = commentInsertDecision(
    {
      signedIn: true,
      birthDate: typeof profile.data?.birth_date === "string" ? profile.data.birth_date : null,
      birthYear: typeof profile.data?.comment_birth_year === "number" ? profile.data.comment_birth_year : null,
      birthMonth: typeof profile.data?.comment_birth_month === "number" ? profile.data.comment_birth_month : null,
      countToday: typeof countPreview.data === "number" ? countPreview.data : 0,
    },
    chicagoToday(),
  );
  if (!decision.ok) return privateJson({ ok: false, message: decision.message }, 403);
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
