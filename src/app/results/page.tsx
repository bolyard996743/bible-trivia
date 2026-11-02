import { ResultsClient } from "@/components/ResultsClient";
import { questionsForDisplay } from "@/lib/bible/present";
import { loadCatalog } from "@/lib/content/load";

export default function ResultsPage() {
  const catalog = loadCatalog();
  return <ResultsClient questions={questionsForDisplay(catalog.questions)} lines={catalog.lines} />;
}
