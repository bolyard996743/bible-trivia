export type LikeView = {
  liked: boolean;
  /** Null hides the number, including when the likes table is not applied yet. */
  count: number | null;
};

export function applyLikeToggle(state: LikeView): LikeView {
  const liked = !state.liked;
  if (state.count === null) return { liked, count: null };
  const count = state.liked ? Math.max(0, state.count - 1) : state.count + 1;
  return { liked, count };
}

export function likeTap(
  input: { signedIn: boolean } & LikeView,
): { type: "prompt-sign-in" } | { type: "toggle"; next: LikeView } {
  if (!input.signedIn) return { type: "prompt-sign-in" };
  return { type: "toggle", next: applyLikeToggle(input) };
}
