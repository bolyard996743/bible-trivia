import { isSupabaseConfigured } from "./supabase";

export type PublicBoardRow = {
  username: string;
  points: number;
  rank?: number;
};

export function normalizePoints(points: number): number {
  if (!Number.isFinite(points)) return 0;
  return Math.max(0, Math.floor(points));
}

export function topBoardUrl(supabaseUrl: string): string {
  return new URL("/rest/v1/rpc/leaderboard_top", supabaseUrl).toString();
}

/** GET URL for the read-only score window. The only query value is the point total. */
export function aroundScoreUrl(supabaseUrl: string, points: number): string {
  const url = new URL("/rest/v1/rpc/leaderboard_around_score", supabaseUrl);
  url.searchParams.set("score", String(normalizePoints(points)));
  return url.toString();
}

function rowsFromJson(value: unknown): PublicBoardRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as { username?: unknown; points?: unknown; rank?: unknown };
    if (typeof record.username !== "string" || typeof record.points !== "number") return [];
    return [
      {
        username: record.username,
        points: record.points,
        rank: typeof record.rank === "number" ? record.rank : undefined,
      },
    ];
  });
}

function anonHeaders(): Record<string, string> {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  };
}

/** Read-only top 15. GET only, so a signed-out player sends no identifier. */
export async function fetchTopBoard(): Promise<PublicBoardRow[]> {
  if (!isSupabaseConfigured()) return [];
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const response = await fetch(topBoardUrl(base), { method: "GET", headers: anonHeaders() });
  if (!response.ok) return [];
  return rowsFromJson(await response.json());
}

/** Read-only. Sends the point total and no name, email, or device id. */
export async function fetchAroundScore(points: number): Promise<PublicBoardRow[]> {
  if (!isSupabaseConfigured()) return [];
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const response = await fetch(aroundScoreUrl(base, points), {
    method: "GET",
    headers: anonHeaders(),
  });
  if (!response.ok) return [];
  return rowsFromJson(await response.json());
}

export async function fetchSignedInBoards(): Promise<{ top: PublicBoardRow[]; near: PublicBoardRow[] }> {
  const { getSupabaseBrowserClient } = await import("./supabase");
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { top: [], near: [] };
  const [top, near] = await Promise.all([
    supabase.rpc("leaderboard_top"),
    supabase.rpc("leaderboard_near"),
  ]);
  return {
    top: rowsFromJson(top.data),
    near: rowsFromJson(near.data),
  };
}
