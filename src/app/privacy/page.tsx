import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { PRIVACY_INTRO, PRIVACY_SECTIONS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy · Noble Bereans",
  description: "What Noble Bereans keeps, why, and where it is stored.",
};

export default function PrivacyPage() {
  return <LegalDocument title="Privacy" intro={PRIVACY_INTRO} sections={PRIVACY_SECTIONS} testId="privacy-page" />;
}
