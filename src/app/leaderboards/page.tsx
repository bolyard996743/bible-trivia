import { LeaderboardClient } from "@/components/LeaderboardClient";
import { loadCatalog } from "@/lib/content/load";

export default function LeaderboardsPage() {
  const { questions, lines } = loadCatalog();
  return <LeaderboardClient questions={questions} lines={lines} />;
}
