import type { AdminComment, PublicComment } from "./comment-types";

/** Local screenshot data only. The API returns these when the fixture env is set on localhost. */
export const publicCommentFixtures: PublicComment[] = [
  {
    id: "fixture-comment-1",
    body: "This verse is a good reminder today.",
    createdAt: "2026-11-24T15:00:00.000Z",
    username: "Amina",
    mascot: "shalom",
    mine: false,
  },
  {
    id: "fixture-comment-2",
    body: "I read this with my family.",
    createdAt: "2026-11-24T16:00:00.000Z",
    username: "Sam",
    mascot: "judah",
    mine: true,
  },
];

export const adminCommentFixtures: AdminComment[] = [
  {
    id: "fixture-admin-1",
    userId: "00000000-0000-4000-8000-000000000001",
    username: "Amina",
    mascot: "shalom",
    body: "This verse is a good reminder today.",
    createdAt: "2026-11-24T15:00:00.000Z",
    devotionDate: "2026-11-24",
    hidden: true,
    removed: false,
    banned: false,
    reports: 1,
    birthYear: 2014,
    birthMonth: 3,
  },
  {
    id: "fixture-admin-2",
    userId: "00000000-0000-4000-8000-000000000002",
    username: "Sam",
    mascot: "judah",
    body: "I read this with my family.",
    createdAt: "2026-11-24T16:00:00.000Z",
    devotionDate: "2026-11-24",
    hidden: false,
    removed: false,
    banned: false,
    reports: 0,
    birthYear: 1990,
    birthMonth: 6,
  },
];

export function commentFixturesAllowed(request: Request): boolean {
  if (process.env.COMMENT_SCREENSHOT_FIXTURES !== "1") return false;
  if (process.env.VERCEL) return false;
  const host = new URL(request.url).hostname;
  return host === "127.0.0.1" || host === "localhost";
}
