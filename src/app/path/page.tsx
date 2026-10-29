import { PathClient } from "@/components/PathClient";
import { loadCatalog } from "@/lib/content/load";

export default function PathPage() {
  const { questions } = loadCatalog();
  return <PathClient questions={questions} />;
}
