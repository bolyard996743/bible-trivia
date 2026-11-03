"use client";

import Link from "next/link";
import { guideLine, homeCopy, stageStatuses } from "@/lib/mockup/preview";
import { ExampleCard, ScreenHeading } from "../ui";
import { usePreview } from "../preview-context";

export function HomeMock() {
  const { preview, href } = usePreview();
  const copy = homeCopy(preview);
  const stages = stageStatuses(preview.player);
  const progressed = preview.player === "progressed";

  return (
    <section className="grid gap-4" data-testid="mockup-home">
      <ScreenHeading kicker={copy.kicker} title={copy.title} body={copy.body} />
      <ExampleCard>
        <p className="text-base text-ink-soft">Example line from your guide</p>
        <p className="text-lg text-ink">{guideLine(preview.mascot)}</p>
      </ExampleCard>
      <ExampleCard className="grid gap-3">
        <div>
          <p className="text-base font-semibold text-gold">Today · example</p>
          <h2 className="text-2xl font-semibold text-grove-deep">
            {progressed ? "One review and one memory verse" : "Your first practice"}
          </h2>
          <p className="mt-1 text-lg text-ink">
            A review of John 3:16, then a fill-in-the-blank for Psalm 119:105. Nothing you tap is saved.
          </p>
        </div>
        <Link
          href={href("/mockup/play")}
          data-testid="mockup-start-practice"
          className="tap inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
        >
          {progressed ? "Continue practice" : "Start practice"}
        </Link>
      </ExampleCard>
      <ExampleCard>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold text-grove-deep">Path</h2>
          <Link href={href("/mockup/path")} className="text-base font-semibold text-grove-deep underline">
            Open
          </Link>
        </div>
        <ol className="grid gap-2" aria-label="Example path snapshot">
          {stages.map((stage) => (
            <li key={stage.name} className="flex items-center justify-between gap-3 text-lg">
              <span className={stage.status === "ahead" ? "text-ink-soft" : "text-ink"}>{stage.name}</span>
              <span className="text-base text-ink-soft">
                {stage.status === "here" ? "You are here" : stage.status === "done" ? "Example done" : "Locked"}
              </span>
            </li>
          ))}
        </ol>
      </ExampleCard>
      {progressed ? (
        <div className="grid gap-3">
          <ExampleCard>
            <p className="text-base text-gold">Example</p>
            <h2 className="text-xl font-semibold text-grove-deep">Collection is open</h2>
            <p className="mt-1 text-lg text-ink">Six example marks are on the shelf. One spot is still empty.</p>
            <Link
              href={href("/mockup/collection")}
              className="tap mt-3 inline-flex items-center justify-center rounded-2xl border border-grove px-4 text-lg text-grove-deep"
            >
              Open collection
            </Link>
          </ExampleCard>
          <ExampleCard>
            <p className="text-base text-gold">Example</p>
            <h2 className="text-xl font-semibold text-grove-deep">Example family</h2>
            <p className="mt-1 text-lg text-ink">Three example members. This week they read John 3:16.</p>
            <Link
              href={href("/mockup/groups")}
              className="tap mt-3 inline-flex items-center justify-center rounded-2xl border border-grove px-4 text-lg text-grove-deep"
            >
              Open groups
            </Link>
          </ExampleCard>
        </div>
      ) : (
        <ExampleCard>
          <h2 className="text-xl font-semibold text-grove-deep">Collection and Groups stay hidden</h2>
          <p className="mt-1 text-lg text-ink">
            A new player sees only Home and Path. Those other tabs open after some of the path is walked. Switch
            Preview controls to Progressed to see that example.
          </p>
        </ExampleCard>
      )}
    </section>
  );
}
