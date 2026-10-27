export function shuffleChoices<T>(items: T[], random: () => number): T[] {
  const next = items.slice();
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = next[index];
    next[index] = next[swapIndex] as T;
    next[swapIndex] = current as T;
  }
  return next;
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Order used when the same question is asked again.
 * Choice ids stay with their text. A shuffle that lands on the original
 * order is rotated so the retry is not a copy of the first layout.
 */
export function orderChoicesForRetry<T extends { id: string }>(choices: T[], attemptKey: string): T[] {
  if (choices.length < 2) return choices.slice();
  const shuffled = shuffleChoices(choices, mulberry32(hashSeed(attemptKey)));
  const unchanged = shuffled.every((choice, index) => choice.id === choices[index]?.id);
  if (!unchanged) return shuffled;
  return [...choices.slice(1), choices[0] as T];
}
