"use client";

import { BOOK_SECTIONS, STAGE_TOPICS, isBookGated } from "@/lib/curriculum";
import { activeTopics, booksWithContent, gateStatus } from "@/lib/game/ladder";
import { KNOWLEDGE_PATH, type KnowledgeStage, type Question } from "@/lib/game/types";
import type { GameProgress } from "@/lib/game/types";

export function StageMap({ questions, progress }: { questions: Question[]; progress: GameProgress }) {
  const stage = progress.stage ?? "Seed";
  const status = gateStatus(questions, progress);
  const clearedTopics = new Set(progress.clearedTopics ?? []);
  const clearedBooks = new Set(progress.clearedBooks ?? []);
  const bookMode = isBookGated(stage);
  const topics = STAGE_TOPICS[stage];
  const liveTopics = new Set(activeTopics(questions, stage));
  const liveBooks = new Set(booksWithContent(questions, stage));

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
                {section.books.map((book) => (
                  <li key={book}>
                    <BookChip book={book} cleared={clearedBooks.has(book)} available={liveBooks.has(book)} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <li key={topic}>
              <TopicChip topic={topic} cleared={clearedTopics.has(topic)} available={liveTopics.has(topic)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TopicChip({ topic, cleared, available }: { topic: string; cleared: boolean; available: boolean }) {
  const state = !available ? "coming-soon" : cleared ? "cleared" : "open";
  return (
    <span data-testid={`topic-${topic}`} data-state={state} className={chipClass(state)}>
      {topic}
    </span>
  );
}

function BookChip({ book, cleared, available }: { book: string; cleared: boolean; available: boolean }) {
  const state = !available ? "coming-soon" : cleared ? "cleared" : "open";
  return (
    <span data-testid={`book-${book}`} data-state={state} className={chipClass(state)}>
      {book}
    </span>
  );
}

function chipClass(state: "cleared" | "open" | "coming-soon"): string {
  if (state === "cleared") return "inline-flex rounded-full bg-grove px-3 py-1 text-base text-white";
  if (state === "open") return "inline-flex rounded-full border border-grove bg-card px-3 py-1 text-base text-grove-deep";
  return "inline-flex rounded-full border border-line bg-parchment px-3 py-1 text-base text-ink-soft";
}

export type { KnowledgeStage };
