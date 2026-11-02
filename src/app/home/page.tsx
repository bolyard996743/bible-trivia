import { HomeClient } from "@/components/HomeClient";
import { questionsForDisplay } from "@/lib/bible/present";
import { loadCatalog } from "@/lib/content/load";

export default function HomePage() {
  const catalog = loadCatalog();
  return <HomeClient questions={questionsForDisplay(catalog.questions)} lines={catalog.lines} />;
}
