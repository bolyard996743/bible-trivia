import { PlacementClient } from "@/components/PlacementClient";
import { questionsForDisplay } from "@/lib/bible/present";
import { loadCatalog } from "@/lib/content/load";

export default function PlacementPage() {
  const { questions, lines, audioFiles } = loadCatalog();
  return <PlacementClient questions={questionsForDisplay(questions)} lines={lines} audioFiles={audioFiles} />;
}
