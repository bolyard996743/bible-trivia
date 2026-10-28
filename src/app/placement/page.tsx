import { PlacementClient } from "@/components/PlacementClient";
import { loadCatalog } from "@/lib/content/load";

export default function PlacementPage() {
  const { questions, lines, audioFiles } = loadCatalog();
  return <PlacementClient questions={questions} lines={lines} audioFiles={audioFiles} />;
}
