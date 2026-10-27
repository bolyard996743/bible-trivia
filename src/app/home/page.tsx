import { HomeClient } from "@/components/HomeClient";
import { loadCatalog } from "@/lib/content/load";

export default function HomePage() {
  const catalog = loadCatalog();
  return <HomeClient questions={catalog.questions} lines={catalog.lines} />;
}
