"use client";

import { useState } from "react";
import Link from "next/link";
import { COLLECTION_ITEMS } from "@/lib/mockup/preview";
import { ExampleCard, ScreenHeading } from "../ui";
import { usePreview } from "../preview-context";

export function CollectionMock() {
  const { preview, href } = usePreview();
  const [openId, setOpenId] = useState<string | null>(null);

  if (preview.player === "new") {
    return (
      <section className="grid gap-4" data-testid="mockup-collection-locked">
        <ScreenHeading
          kicker="Collection · locked"
          title="This shelf is not open yet"
          body="A new player sees only Home and Path. Collection opens after some of the path is walked."
        />
        <ExampleCard>
          <p className="text-lg text-ink">
            Switch Preview controls to Progressed to see an example shelf. Nothing here is saved.
          </p>
          <Link
            href={href("/mockup/home")}
            className="tap mt-3 inline-flex items-center justify-center rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
          >
            Back to Home
          </Link>
        </ExampleCard>
      </section>
    );
  }

  const open = COLLECTION_ITEMS.find((item) => item.id === openId) ?? null;

  return (
    <section className="grid gap-4" data-testid="mockup-collection">
      <ScreenHeading
        kicker="Collection · example"
        title="Marks from the path so far"
        body="These verses and stage marks are examples for a player who has reached Growing."
      />
      <ul className="grid gap-2">
        {COLLECTION_ITEMS.map((item) => {
          const selected = item.id === openId;
          return (
            <li key={item.id}>
              <button
                type="button"
                data-testid={`mockup-collect-${item.id}`}
                aria-pressed={selected}
                onClick={() => setOpenId(selected ? null : item.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 text-left ${
                  selected ? "border-grove bg-grove text-white" : "border-line bg-card text-ink"
                }`}
              >
                <span>
                  <span className="block text-lg font-semibold">{item.title}</span>
                  <span className={`block text-base ${selected ? "text-white" : "text-ink-soft"}`}>{item.detail}</span>
                </span>
                <span className="text-base">{item.kind}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {open ? (
        <ExampleCard>
          <p className="text-base font-semibold text-gold">{open.kind} · example</p>
          <h2 className="text-2xl font-semibold text-grove-deep">{open.title}</h2>
          <p className="mt-2 text-lg text-ink">
            {open.body ?? "This example spot is still empty. Later lessons would land here."}
          </p>
          {open.body ? <p className="mt-2 text-base text-ink-soft">NKJV · example quotation</p> : null}
        </ExampleCard>
      ) : (
        <p className="text-base text-ink-soft">Tap a mark to read the example.</p>
      )}
    </section>
  );
}
