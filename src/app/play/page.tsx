import { Suspense } from "react";
import { PlayClient } from "@/components/PlayClient";
import { questionsForDisplay } from "@/lib/bible/present";
import { loadCatalog } from "@/lib/content/load";

export default function PlayPage() {
  const catalog = loadCatalog();
  return (
    <Suspense fallback={<p className="text-lg text-ink-soft">Opening…</p>}>
      <PlayClient
        questions={questionsForDisplay(catalog.questions)}
        lines={catalog.lines}
        audioFiles={catalog.audioFiles}
      />
    </Suspense>
  );
}
