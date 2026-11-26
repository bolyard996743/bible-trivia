import type { Metadata } from "next";
import { DailyChallengeClient } from "@/components/DailyChallengeClient";

export const metadata: Metadata = {
  title: "Daily question · Noble Bereans",
};

export default function DailyPage() {
  return <DailyChallengeClient />;
}
