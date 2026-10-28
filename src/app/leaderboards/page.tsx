import { LeaderboardClient } from "@/components/LeaderboardClient";
import { loadCatalog } from "@/lib/content/load";

export default function LeaderboardsPage() {
  const { lines } = loadCatalog();
  return <LeaderboardClient lines={lines} />;
}
