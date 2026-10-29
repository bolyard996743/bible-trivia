import { describe, expect, it } from "vitest";
import { aroundScore, nearYouWindow, rankPlayers, topBoard } from "@/lib/account/ranking";
import { pointsFromProgress } from "@/lib/account/points";
import { aroundScoreUrl } from "@/lib/account/leaderboard";

const players = Array.from({ length: 20 }, (_, index) => ({
  username: `Player${String(index + 1).padStart(2, "0")}`,
  points: 100 - index,
}));

describe("leaderboard windows", () => {
  const ranked = rankPlayers(players);

  it("ranks higher points first and limits the top board to 15", () => {
    expect(ranked[0]).toMatchObject({ username: "Player01", points: 100, rank: 1 });
    expect(topBoard(ranked)).toHaveLength(15);
    expect(topBoard(ranked).at(-1)?.rank).toBe(15);
  });

  it("keeps ten above and four below, and shortens the window at the edges", () => {
    expect(nearYouWindow(ranked, "Player01").map((player) => player.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(nearYouWindow(ranked, "Player11").map((player) => player.rank)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    expect(nearYouWindow(ranked, "Player20").map((player) => player.rank)).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]);
    expect(nearYouWindow(ranked, "Missing")).toEqual([]);
  });

  it("returns about fifteen public rows around a score and does not insert the caller", () => {
    const window = aroundScore(ranked, 90);
    expect(window.length).toBeLessThanOrEqual(15);
    expect(window.some((player) => player.points === 90)).toBe(true);
    expect(window.every((player) => player.username.startsWith("Player"))).toBe(true);
    expect(aroundScore(ranked, 1000)[0]?.rank).toBe(1);
    expect(aroundScore(ranked, 0).at(-1)?.rank).toBe(20);
  });
});

describe("leaderboard points", () => {
  it("weights mastered questions by tier and ignores the rest", () => {
    const questions = [
      { id: "a", tier: "foundation" as const },
      { id: "b", tier: "expert" as const },
      { id: "c", tier: "advanced" as const },
    ];
    expect(pointsFromProgress(questions, ["a", "b"])).toBe(5);
    expect(pointsFromProgress(questions, [])).toBe(0);
  });

  it("puts only the point total on the read-only request", () => {
    const url = aroundScoreUrl("https://example.supabase.co", 12.8);
    expect(url).toBe("https://example.supabase.co/rest/v1/rpc/leaderboard_around_score?score=12");
    expect(url).not.toContain("email");
    expect(url).not.toContain("token");
    expect(url).not.toContain("username");
  });
});
