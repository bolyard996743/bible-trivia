import { PathClient } from "@/components/PathClient";
import { questionsForDisplay } from "@/lib/bible/present";
import { loadCatalog } from "@/lib/content/load";

export default function PathPage() {
  const { questions } = loadCatalog();
  return <PathClient questions={questionsForDisplay(questions)} />;
}
