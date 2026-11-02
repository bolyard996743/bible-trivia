import { PlayClient } from "@/components/PlayClient";
import { questionsForDisplay } from "@/lib/bible/present";
import { loadCatalog } from "@/lib/content/load";

export default function PlayPage() {
  const catalog = loadCatalog();
  return (
    <PlayClient
      questions={questionsForDisplay(catalog.questions)}
      lines={catalog.lines}
      audioFiles={catalog.audioFiles}
    />
  );
}
