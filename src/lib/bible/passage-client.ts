import { getBibleProvider } from "@/lib/bible";
import type { BiblePassage, ScriptureResult } from "@/lib/bible/types";

const pending = new Map<string, Promise<ScriptureResult<BiblePassage>>>();
const resolved = new Map<string, ScriptureResult<BiblePassage>>();

export function peekPassage(ref: string): BiblePassage | null {
  const hit = resolved.get(ref);
  return hit?.ok ? hit.data : null;
}

/** One in-flight read per reference. A prefetch and the later display share it. */
export function loadPassageCached(ref: string): Promise<ScriptureResult<BiblePassage>> {
  const done = resolved.get(ref);
  if (done) return Promise.resolve(done);
  const existing = pending.get(ref);
  if (existing) return existing;
  const promise = getBibleProvider()
    .getPassage(ref)
    .then((result) => {
      resolved.set(ref, result);
      pending.delete(ref);
      return result;
    });
  pending.set(ref, promise);
  return promise;
}

/** Start the verse fetch while the question is on screen. Display still reports FUMS. */
export function prefetchPassages(refs: readonly string[]): void {
  for (const ref of refs) void loadPassageCached(ref);
}
