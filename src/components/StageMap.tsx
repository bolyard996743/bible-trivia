"use client";

import { BOOK_SECTIONS, isBookGated } from "@/lib/curriculum";
import { gateStatus, stageChecklist } from "@/lib/game/ladder";
import { KNOWLEDGE_PATH, type KnowledgeStage, type Question } from "@/lib/game/types";
import type { GameProgress } from "@/lib/game/types";

export function StageMap({ questions, progress }: { questions: Question[]; progress: GameProgress }) {
  const stage = progress.stage ?? "Seed";
  const status = gateStatus(questions, progress);
  const bookMode = isBookGated(stage);
  const items = stageChecklist(questions, progress);
  const byId = new Map(items.map((item) => [item.id, item]));

  return (
    <section className="grid gap-4" data-testid="stage-map">
      <div>
        <p className="text-base text-gold">{stage}</p>
        <h1 className="text-3xl font-semibold text-grove-deep">Your stage map</h1>
        <p className="mt-2 text-lg text-ink" data-testid="stage-counter">
          {status.cleared} of {status.required} cleared
        </p>
      </div>
      <ol className="flex flex-wrap gap-2" aria-label="Knowledge Path">
        {KNOWLEDGE_PATH.map((name) => (
          <li
            key={name}
            className={`rounded-full border px-3 py-1 text-base ${
              name === stage ? "border-grove bg-grove text-white" : "border-line bg-card text-ink-soft"
            }`}
          >
            {name}
          </li>
        ))}
      </ol>
      {bookMode ? (
        <div className="grid gap-4">
          {BOOK_SECTIONS.map((section) => (
            <div key={section.id}>
              <h2 className="mb-2 text-xl font-semibold text-grove-deep">{section.label}</h2>
              <ul className="flex flex-wrap gap-2">
                {section.books.map((book) => {
                  const item = byId.get(book) ?? { id: book, label: book, state: "coming-soon" as const };
                  return (
                    <li key={book}>
                      <Chip id={item.id} label={item.label} state={item.state} kind="book" />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Chip id={item.id} label={item.label} state={item.state} kind="topic" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Chip({
  id,
  label,
  state,
  kind,
}: {
  id: string;
  label: string;
  state: "cleared" | "open" | "coming-soon";
  kind: "topic" | "book";
}) {
  return (
    <span data-testid={`${kind}-${id}`} data-state={state} className={chipClass(state)}>
      {label}
    </span>
  );
}

function chipClass(state: "cleared" | "open" | "coming-soon"): string {
  if (state === "cleared") return "inline-flex rounded-full bg-grove px-3 py-1 text-base text-white";
  if (state === "open") return "inline-flex rounded-full border border-grove bg-card px-3 py-1 text-base text-grove-deep";
  return "inline-flex rounded-full border border-line bg-parchment px-3 py-1 text-base text-ink-soft";
}

export type { KnowledgeStage };
