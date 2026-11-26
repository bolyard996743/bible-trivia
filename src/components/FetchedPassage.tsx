"use client";

import { useEffect, useState } from "react";
import { FumsTrack } from "@/components/FumsTrack";
import { ScriptureNotice } from "@/components/ScriptureNotice";
import { loadPassageCached, peekPassage } from "@/lib/bible/passage-client";
import type { BiblePassage } from "@/lib/bible/types";

/** Fetches one reference when it is shown. The bundled quotation is not rendered. */
export function FetchedPassage({ reference }: { reference: string }) {
  const ready = peekPassage(reference);
  const [passage, setPassage] = useState<BiblePassage | null>(ready);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(ready == null);

  useEffect(() => {
    const cached = peekPassage(reference);
    if (cached) {
      setPassage(cached);
      setMessage(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setPassage(null);
    setMessage(null);
    void loadPassageCached(reference)
      .then((result) => {
        if (!active) return;
        if (result.ok) setPassage(result.data);
        else setMessage(result.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reference]);

  return (
    <figure data-testid="verse" className="min-w-0 rounded-2xl bg-gold-soft px-4 py-3">
      {loading && !passage ? (
        <p data-testid="verse-loading" className="text-lg text-ink">
          Opening this verse…
        </p>
      ) : null}
      {passage ? (
        <blockquote data-testid="verse-text" className="text-lg break-words text-ink">
          {passage.verses.map((verse) => (
            <span key={`${verse.chapter}:${verse.verse}`}>
              {passage.verses.length > 1 ? <sup className="mr-1">{verse.verse}</sup> : null}
              {verse.text}{" "}
            </span>
          ))}
        </blockquote>
      ) : null}
      {message ? (
        <p data-testid="verse-unavailable" className="text-lg text-ink">
          {message}
        </p>
      ) : null}
      <figcaption className="mt-2 text-base break-words text-ink-soft">
        {reference} · NKJV
      </figcaption>
      {passage ? <ScriptureNotice copyright={passage.copyright} /> : null}
      {!loading && !passage ? <ScriptureNotice copyright="" /> : null}
      {passage ? <FumsTrack tokens={[passage.fumsToken]} /> : null}
    </figure>
  );
}
