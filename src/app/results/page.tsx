import { ResultsClient } from "@/components/ResultsClient";
import { loadCatalog } from "@/lib/content/load";

export default function ResultsPage() {
  const catalog = loadCatalog();
  return <ResultsClient questions={catalog.questions} lines={catalog.lines} />;
}
