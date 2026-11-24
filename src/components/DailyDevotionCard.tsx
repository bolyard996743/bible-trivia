import Image from "next/image";
import Link from "next/link";
import { DevotionActions } from "@/components/DevotionActions";
import { FumsTrack } from "@/components/FumsTrack";
import { ScriptureNotice } from "@/components/ScriptureNotice";
import type { DailyDevotionView } from "@/lib/devotion/types";

export function DailyDevotionCard({ devotion }: { devotion: DailyDevotionView }) {
  return (
    <article aria-label="Daily Devotion" data-testid="daily-devotion" className="relative overflow-hidden rounded-3xl bg-black text-white">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src={devotion.imageSrc}
          alt={devotion.imageAlt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-cover"
        />
      </div>
      <div className="relative z-10 flex min-h-[36rem] flex-col sm:min-h-[32rem]">
        <header>
          <div className="bg-black/90 px-5 pt-5 pb-4">
            <p className="text-sm font-medium tracking-wide">Daily Devotion</p>
            <p className="text-sm">Verse of the Day</p>
            <p data-testid="devotion-reference" className="mt-1 text-xl font-semibold">
              {devotion.label}
            </p>
          </div>
          <div aria-hidden="true" className="h-16 bg-gradient-to-b from-black/90 to-transparent" />
        </header>
        <div className="mt-auto">
          <div aria-hidden="true" className="h-20 bg-gradient-to-t from-black/90 to-transparent" />
          <div className="bg-black/90 px-5 pb-5">
            {devotion.text ? (
              <blockquote
                data-testid="devotion-verse"
                className="font-serif text-[1.65rem] leading-snug text-white sm:text-3xl"
              >
                {devotion.text}
              </blockquote>
            ) : (
              <p data-testid="devotion-fallback" className="text-lg text-white">
                <Link href={devotion.bibleHref} className="font-semibold text-white underline">
                  Read it in the Bible tab
                </Link>
              </p>
            )}
            {devotion.text && devotion.copyright ? (
              <ScriptureNotice
                copyright={devotion.copyright}
                className="mt-3 grid gap-1 text-sm leading-snug text-white/95 [&_a]:text-white"
              />
            ) : null}
            {devotion.text ? <FumsTrack tokens={[devotion.fumsToken]} /> : null}
            <DevotionActions devotionId={devotion.id} devotionDate={devotion.date} referenceLabel={devotion.label} />
          </div>
        </div>
      </div>
    </article>
  );
}
