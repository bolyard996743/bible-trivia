import type { Metadata } from "next";
import { DonateScreen } from "@/components/DonateScreen";
import { loadDonateVerses } from "@/lib/donate-verses";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Donate · Noble Bereans",
  description: "Give to keep Noble Bereans free. Gifts are not tax-deductible yet.",
};

export default async function DonatePage() {
  const verses = await loadDonateVerses();
  return <DonateScreen verses={verses} />;
}
