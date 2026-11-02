import { LeaderboardClient } from "@/components/LeaderboardClient";
import { questionsForDisplay } from "@/lib/bible/present";
import { loadCatalog } from "@/lib/content/load";

export default function LeaderboardsPage() {
  const { questions, lines } = loadCatalog();
  return <LeaderboardClient questions={questionsForDisplay(questions)} lines={lines} />;
}
