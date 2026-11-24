import { DailyDevotionCard } from "@/components/DailyDevotionCard";
import { HomeClient } from "@/components/HomeClient";
import { questionsForDisplay } from "@/lib/bible/present";
import { loadCatalog } from "@/lib/content/load";
import { loadDailyDevotion } from "@/lib/devotion/load";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage() {
  const catalog = loadCatalog();
  const devotion = await loadDailyDevotion();
  return (
    <div className="grid gap-6">
      <DailyDevotionCard devotion={devotion} />
      <HomeClient questions={questionsForDisplay(catalog.questions)} lines={catalog.lines} />
    </div>
  );
}
