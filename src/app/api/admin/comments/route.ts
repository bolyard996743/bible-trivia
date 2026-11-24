import { getServiceRoleClient } from "@/lib/account/service-role";
import { getUserClient } from "@/lib/account/user-client";
import { isCommentAdmin } from "@/lib/devotion/comment-admin";
import { adminCommentFixtures, commentFixturesAllowed } from "@/lib/devotion/comment-fixtures";
import { asMascot, bearerToken, privateJson, schemaMissing } from "@/lib/devotion/comment-http";
import type { AdminComment } from "@/lib/devotion/comment-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function adminUser(request: Request) {
  const token = bearerToken(request);
  if (!token) return null;
  const client = getUserClient(token);
  if (!client) return null;
  const userResult = await client.auth.getUser(token);
  const user = userResult.data.user;
  if (userResult.error || !user) return null;
  if (!isCommentAdmin({ userId: user.id, email: user.email })) return null;
  return user;
}

export async function GET(request: Request) {
  if (commentFixturesAllowed(request)) {
    return privateJson({ ok: true, available: true, comments: adminCommentFixtures });
  }
  const user = await adminUser(request);
  if (!user) return privateJson({ ok: false, signedIn: false }, 401);
  const service = getServiceRoleClient();
  if (!service) return privateJson({ ok: true, available: false });
  const listed = await service
    .from("devotion_comments")
    .select("id, user_id, body, created_at, hidden_at, removed_at, devotion_date")
    .order("created_at", { ascending: false })
    .limit(40);
  if (schemaMissing(listed.error)) return privateJson({ ok: true, available: false });
  if (listed.error || !listed.data) return privateJson({ ok: true, available: false });
  const userIds = [...new Set(listed.data.map((row) => row.user_id as string))];
  const commentIds = listed.data.map((row) => row.id as string);
  const [profiles, bans, reports] = await Promise.all([
    userIds.length
      ? service.from("profiles").select("user_id, username, mascot").in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? service.from("devotion_comment_bans").select("user_id").in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    commentIds.length
      ? service.from("devotion_comment_reports").select("comment_id").in("comment_id", commentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (schemaMissing(profiles.error) || schemaMissing(bans.error) || schemaMissing(reports.error)) {
    return privateJson({ ok: true, available: false });
  }
  const profileById = new Map(
    (profiles.data ?? []).map((row) => [row.user_id as string, row]),
  );
  const banned = new Set((bans.data ?? []).map((row) => row.user_id as string));
  const reportCounts = new Map<string, number>();
  for (const row of reports.data ?? []) {
    const id = row.comment_id as string;
    reportCounts.set(id, (reportCounts.get(id) ?? 0) + 1);
  }
  const comments: AdminComment[] = listed.data.map((row) => {
    const profile = profileById.get(row.user_id as string);
    const username =
      typeof profile?.username === "string" && profile.username.trim() && !profile.username.includes("@")
        ? profile.username.trim()
        : "Player";
    return {
      id: row.id as string,
      userId: row.user_id as string,
      username,
      mascot: asMascot(profile?.mascot),
      body: row.body as string,
      createdAt: row.created_at as string,
      devotionDate: row.devotion_date as string,
      hidden: row.hidden_at != null,
      removed: row.removed_at != null,
      banned: banned.has(row.user_id as string),
      reports: reportCounts.get(row.id as string) ?? 0,
    };
  });
  return privateJson({ ok: true, available: true, comments });
}

export async function POST(request: Request) {
  if (commentFixturesAllowed(request)) return privateJson({ ok: true, available: true });
  const user = await adminUser(request);
  if (!user) return privateJson({ ok: false, signedIn: false }, 401);
  const service = getServiceRoleClient();
  if (!service) return privateJson({ ok: true, available: false });
  let payload: { action?: unknown; commentId?: unknown; userId?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return privateJson({ ok: false, message: "Please try that again." }, 400);
  }
  const commentId = typeof payload.commentId === "string" ? payload.commentId : "";
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  let result: { error: { code?: string; message?: string } | null };
  if (payload.action === "remove" && commentId) {
    result = await service
      .from("devotion_comments")
      .update({ removed_at: new Date().toISOString(), hidden_at: new Date().toISOString() })
      .eq("id", commentId);
  } else if (payload.action === "restore" && commentId) {
    result = await service.from("devotion_comments").update({ removed_at: null, hidden_at: null }).eq("id", commentId);
  } else if (payload.action === "ban" && userId) {
    result = await service.from("devotion_comment_bans").upsert({ user_id: userId, banned_at: new Date().toISOString() });
  } else if (payload.action === "unban" && userId) {
    result = await service.from("devotion_comment_bans").delete().eq("user_id", userId);
  } else {
    return privateJson({ ok: false, message: "That action isn't available." }, 400);
  }
  if (schemaMissing(result.error)) return privateJson({ ok: true, available: false });
  if (result.error) return privateJson({ ok: false, message: "Please try that again." }, 400);
  return privateJson({ ok: true, available: true });
}
