"use client";

import { useEffect, useState } from "react";
import { FetchedPassage } from "@/components/FetchedPassage";
import { readMissedVerses } from "@/lib/play/missed-verses";

export function MyVersesClient() {
  const [refs, setRefs] = useState<string[] | null>(null);

  useEffect(() => {
    setRefs(readMissedVerses(window.localStorage));
  }, []);

  return (
    <section className="grid min-w-0 gap-5" data-testid="my-verses">
      <div className="grid gap-2">
        <h1 className="text-3xl font-semibold text-grove-deep">My Verses</h1>
        <p className="text-lg text-ink">Verses shown after a miss. Only the reference is kept on this device.</p>
      </div>
      {refs === null ? <p className="text-lg text-ink-soft">Opening…</p> : null}
      {refs && refs.length === 0 ? (
        <p className="text-lg text-ink" data-testid="my-verses-empty">
          When a question is missed, its verse will be listed here.
        </p>
      ) : null}
      {refs && refs.length > 0 ? (
        <ul className="grid min-w-0 gap-4">
          {refs.map((ref) => (
            <li key={ref} className="min-w-0" data-testid="my-verse">
              <FetchedPassage reference={ref} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
