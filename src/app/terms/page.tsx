import type { Metadata } from "next";
import { LegalDocument } from "@/components/LegalDocument";
import { TERMS_INTRO, TERMS_SECTIONS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms · Noble Bereans",
  description: "How Noble Bereans is meant to be used.",
};

export default function TermsPage() {
  return <LegalDocument title="Terms" intro={TERMS_INTRO} sections={TERMS_SECTIONS} testId="terms-page" />;
}
