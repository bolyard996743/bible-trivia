import { PlayClient } from "@/components/PlayClient";
import { loadCatalog } from "@/lib/content/load";

export default function PlayPage() {
  const catalog = loadCatalog();
  return <PlayClient questions={catalog.questions} lines={catalog.lines} audioFiles={catalog.audioFiles} />;
}
