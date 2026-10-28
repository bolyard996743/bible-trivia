"use client";

import { getBibleProvider, type BibleProvider } from "@/lib/bible";

export function BibleScreen({ provider = getBibleProvider() }: { provider?: BibleProvider }) {
  return (
    <section className="grid gap-4" data-provider={provider.id}>
      <p className="text-base tracking-wide text-gold uppercase">Scripture</p>
      <h1 className="text-3xl font-semibold text-grove-deep">Bible</h1>
      <p
        data-testid="bible-placeholder"
        className="rounded-3xl border border-line bg-card p-5 text-lg text-ink"
      >
        Bible reading, highlights, and notes coming soon
      </p>
      <p className="text-lg text-ink-soft">
        When reading opens, highlights and notes will stay on this device. They will remember the verse reference, not a copy of the verse.
      </p>
    </section>
  );
}
