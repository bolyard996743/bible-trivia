import { Suspense } from "react";
import { PlacementClient } from "@/components/PlacementClient";
import { questionsForDisplay } from "@/lib/bible/present";
import { loadCatalog } from "@/lib/content/load";

export default function PlacementPage() {
  const { questions, lines, audioFiles } = loadCatalog();
  return (
    <Suspense fallback={<p className="text-lg text-ink-soft">Opening…</p>}>
      <PlacementClient questions={questionsForDisplay(questions)} lines={lines} audioFiles={audioFiles} />
    </Suspense>
  );
}
