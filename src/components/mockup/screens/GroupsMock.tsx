"use client";

import { useState } from "react";
import Link from "next/link";
import { EXAMPLE_GROUP, demographicLabel } from "@/lib/mockup/preview";
import { ExampleCard, ScreenHeading } from "../ui";
import { usePreview } from "../preview-context";

export function GroupsMock() {
  const { preview, href } = usePreview();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);

  if (preview.player === "new") {
    return (
      <section className="grid gap-4" data-testid="mockup-groups-locked">
        <ScreenHeading
          kicker="Groups · locked"
          title="Groups are not open yet"
          body="A new player sees only Home and Path. A group appears after there is a path to share."
        />
        <ExampleCard>
          <p className="text-lg text-ink">
            Switch Preview controls to Progressed to see Example family. No invite is sent from this screen.
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

  const member = EXAMPLE_GROUP.members.find((item) => item.id === memberId) ?? null;

  return (
    <section className="grid gap-4" data-testid="mockup-groups">
      <ScreenHeading
        kicker="Groups · example"
        title={EXAMPLE_GROUP.name}
        body="Three example people. None of them are real accounts, and nothing on this screen is saved."
      />
      <ExampleCard>
        <p className="text-base font-semibold text-gold">This week · example</p>
        <p className="text-lg text-ink">{EXAMPLE_GROUP.week}</p>
      </ExampleCard>
      <ul className="grid gap-2" aria-label="Example members">
        {EXAMPLE_GROUP.members.map((item) => {
          const selected = item.id === memberId;
          const note =
            item.id === "you"
              ? `${demographicLabel(preview.demographic)} · example`
              : item.id === "teen"
                ? "Teen · example"
                : "Child · example";
          return (
            <li key={item.id}>
              <button
                type="button"
                data-testid={`mockup-member-${item.id}`}
                aria-pressed={selected}
                onClick={() => setMemberId(selected ? null : item.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 text-left ${
                  selected ? "border-grove bg-grove text-white" : "border-line bg-card text-ink"
                }`}
              >
                <span>
                  <span className="block text-lg font-semibold">{item.name}</span>
                  <span className={`block text-base ${selected ? "text-white" : "text-ink-soft"}`}>{note}</span>
                </span>
                <span className="text-base">{item.role}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {member ? (
        <ExampleCard>
          <h2 className="text-xl font-semibold text-grove-deep">{member.name}</h2>
          <p className="mt-1 text-lg text-ink">Example profile. Not a real person.</p>
        </ExampleCard>
      ) : null}
      <button
        type="button"
        data-testid="mockup-invite"
        onClick={() => setInvited(true)}
        className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white"
      >
        Invite
      </button>
      {invited ? (
        <p role="status" className="text-lg text-ink">
          Example only. No invite is sent, and nothing is saved.
        </p>
      ) : null}
    </section>
  );
}
