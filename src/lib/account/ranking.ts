export type BoardEntry = {
  username: string;
  points: number;
  rank: number;
};

/** Stable rank: higher points first, then username A–Z. Rank 1 is the top. */
export function rankPlayers(players: { username: string; points: number }[]): BoardEntry[] {
  return [...players]
    .sort((a, b) => b.points - a.points || a.username.localeCompare(b.username))
    .map((player, index) => ({ ...player, rank: index + 1 }));
}

export function topBoard(ranked: BoardEntry[], limit = 15): BoardEntry[] {
  return ranked.filter((player) => player.rank <= limit).slice(0, limit);
}

/**
 * The signed-in window: up to 10 players above, the player, and up to 4 below.
 * Near the top or bottom the missing side is simply shorter.
 */
export function nearYouWindow(ranked: BoardEntry[], username: string, above = 10, below = 4): BoardEntry[] {
  const me = ranked.find((player) => player.username.toLowerCase() === username.toLowerCase());
  if (!me) return [];
  const start = Math.max(1, me.rank - above);
  const end = me.rank + below;
  return ranked.filter((player) => player.rank >= start && player.rank <= end);
}

/**
 * Up to 15 public rows: 7 on each side of the closest score. The caller is not inserted.
 * Near the top or bottom the short side is left short.
 */
export function aroundScore(ranked: BoardEntry[], score: number): BoardEntry[] {
  if (ranked.length === 0) return [];
  let anchor = ranked[0]!;
  let bestDistance = Math.abs(anchor.points - score);
  for (const player of ranked) {
    const distance = Math.abs(player.points - score);
    if (distance < bestDistance || (distance === bestDistance && player.rank < anchor.rank)) {
      anchor = player;
      bestDistance = distance;
    }
  }
  const start = Math.max(1, anchor.rank - 7);
  const end = anchor.rank + 7;
  return ranked.filter((player) => player.rank >= start && player.rank <= end);
}
