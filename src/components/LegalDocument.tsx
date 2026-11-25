import Link from "next/link";
import type { LegalSection } from "@/lib/legal";
import { LEGAL_EFFECTIVE } from "@/lib/legal";

export function LegalDocument({
  title,
  intro,
  sections,
  testId,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
  testId: string;
}) {
  return (
    <article className="grid max-w-full gap-6" data-testid={testId}>
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold text-grove-deep">{title}</h1>
        <p className="text-base text-ink-soft">Effective {LEGAL_EFFECTIVE}</p>
        <p className="text-lg text-ink">{intro}</p>
      </header>
      {sections.map((section) => (
        <section key={section.heading} className="grid gap-2">
          <h2 className="text-2xl font-semibold text-grove-deep">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-lg text-ink [overflow-wrap:anywhere]">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
      <p className="text-lg text-ink">
        <Link href="/privacy" className="tap inline-flex items-center text-grove-deep underline">
          Privacy
        </Link>
      </p>
      <p className="text-lg text-ink">
        <Link href="/terms" className="tap inline-flex items-center text-grove-deep underline">
          Terms
        </Link>
      </p>
    </article>
  );
}
