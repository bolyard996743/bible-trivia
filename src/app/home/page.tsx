import { DailyDevotionCard } from "@/components/DailyDevotionCard";
import { HomeClient } from "@/components/HomeClient";
import { questionsForDisplay } from "@/lib/bible/present";
import { loadCatalog } from "@/lib/content/load";
import { loadDailyDevotion } from "@/lib/devotion/load";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string | string[] }>;
}) {
  const params = await searchParams;
  const account = Array.isArray(params.account) ? params.account[0] : params.account;
  const catalog = loadCatalog();
  const devotion = await loadDailyDevotion();
  return (
    <div className="grid gap-6">
      <DailyDevotionCard devotion={devotion} />
      <HomeClient
        questions={questionsForDisplay(catalog.questions)}
        lines={catalog.lines}
        accountDeleted={account === "deleted"}
      />
    </div>
  );
}
