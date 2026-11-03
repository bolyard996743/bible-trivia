"use client";

import { BadgeArt } from "@/components/mockup/BadgeArt";
import { pathBlocks, type BadgeArt as BadgeArtId } from "@/lib/mockup/preview";
import { usePreview } from "../preview-context";

export function PathMock() {
  const { preview } = usePreview();
  const blocks = pathBlocks(preview.player);

  return (
    <section className="grid gap-6" data-testid="mockup-path">
      <p className="text-base font-semibold text-gold">Path · example</p>
      <ol className="grid gap-6">
        {blocks.map((block) => (
          <li
            key={block.stage}
            data-testid={`mockup-stage-block-${block.stage}`}
            data-state={block.complete ? "complete" : "current"}
            className="rounded-3xl border border-line bg-card p-4"
          >
            <h2 className="text-3xl font-semibold text-grove-deep">{block.stage}</h2>
            <p className="mt-1 text-lg text-ink">{block.learning}</p>
            <ul className="mt-4 grid grid-cols-3 justify-items-center gap-3" aria-label={`${block.stage} sections`}>
              {block.badges.map((badge) => (
                <li key={badge.id}>
                  <BadgeSlot filled={badge.filled} art={badge.art} />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

function BadgeSlot({ filled, art }: { filled: boolean; art: BadgeArtId }) {
  return (
    <span
      data-filled={filled ? "true" : "false"}
      data-art={filled ? art : undefined}
      role="img"
      aria-label={filled ? "Earned example badge" : "Empty section"}
      className={`inline-flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full ${
        filled ? "border-2 border-[#a67c2d] bg-[#fff6e8]" : "border border-[#c8c1b6] bg-[#e5e0d8]"
      }`}
    >
      {filled ? <BadgeArt art={art} /> : null}
    </span>
  );
}
