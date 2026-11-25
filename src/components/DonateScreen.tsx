import { FumsTrack } from "@/components/FumsTrack";
import { ScriptureNotice } from "@/components/ScriptureNotice";
import { NKJV_COPYRIGHT } from "@/lib/bible/notice";
import { DONATE_DISCLOSURE, DONATE_TIERS, liveDonateTiers, type DonateTier, type ShownVerse } from "@/lib/donate";
import { donateAnchorProps } from "@/lib/donate-links";

function verseFor(tier: DonateTier, verses?: Record<string, ShownVerse>): ShownVerse | null {
  if (!tier.verse) return null;
  return (
    verses?.[tier.id] ?? {
      text: tier.verse.fallbackText,
      copyright: NKJV_COPYRIGHT,
      fumsToken: null,
    }
  );
}

export function DonateTierCard({ tier, verse }: { tier: DonateTier; verse: ShownVerse | null }) {
  const link = donateAnchorProps(tier.href);
  if (!link) return null;
  return (
    <article data-testid="donate-tier" data-tier={tier.id} className="grid gap-3">
      <a
        href={link.href}
        target={link.target}
        rel={link.rel}
        className="stage-card tap grid gap-3 text-ink no-underline"
      >
        <p className="text-3xl font-semibold text-grove-deep">{tier.amountLabel}</p>
        <h2 className="text-2xl font-semibold text-grove-deep">{tier.name}</h2>
        <p className="text-lg text-ink">{tier.description}</p>
        {verse && tier.verse ? (
          <figure className="rounded-2xl bg-gold-soft px-4 py-3">
            <blockquote className="text-lg text-ink">{verse.text}</blockquote>
            <figcaption className="mt-2 text-base text-ink-soft">{tier.verse.label}</figcaption>
          </figure>
        ) : null}
        <span className="donate-action inline-flex min-h-[3.25rem] items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
          Donate
          <span className="sr-only"> Opens in a new tab.</span>
        </span>
      </a>
      {verse && tier.verse ? (
        <ScriptureNotice
          copyright={verse.copyright}
          className="grid gap-1 text-base text-ink-soft [&_a]:inline-flex [&_a]:min-h-11 [&_a]:min-w-11 [&_a]:items-center [&_a]:underline"
        />
      ) : null}
      {verse?.fumsToken ? <FumsTrack tokens={[verse.fumsToken]} /> : null}
    </article>
  );
}

export function DonateScreen({
  verses,
  tiers = DONATE_TIERS,
}: {
  verses?: Record<string, ShownVerse>;
  tiers?: readonly DonateTier[];
}) {
  const live = liveDonateTiers(tiers);
  return (
    <article className="grid gap-6" data-testid="donate-page">
      <header className="grid gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-grove-deep">Donate</h1>
          <p className="mt-2 text-lg text-ink">Gifts keep Noble Bereans free for everyone.</p>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <a
            href="#donate-tiers"
            data-testid="donate-main"
            className="tap inline-flex w-full shrink-0 items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white md:w-auto md:px-8"
          >
            Donate
          </a>
          <p data-testid="donate-disclosure" className="min-w-0 flex-1 rounded-3xl border border-line bg-gold-soft p-4 text-lg text-ink">
            {DONATE_DISCLOSURE}
          </p>
        </div>
      </header>
      <section id="donate-tiers" aria-label="Gift amounts" className="grid scroll-mt-6 gap-4">
        <div className="grid items-start gap-4 sm:grid-cols-2">
          {live.map((tier) => (
            <DonateTierCard key={tier.id} tier={tier} verse={verseFor(tier, verses)} />
          ))}
        </div>
      </section>
    </article>
  );
}
