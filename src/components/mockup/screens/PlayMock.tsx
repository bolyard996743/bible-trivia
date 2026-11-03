"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MEMORY_VERSE,
  REVIEW_QUESTION,
  guideLine,
  memoryInstruction,
  reviewPrompt,
} from "@/lib/mockup/preview";
import { ExampleCard, ScreenHeading } from "../ui";
import { usePreview } from "../preview-context";

export function PlayMock() {
  const { preview, href } = usePreview();
  const [picked, setPicked] = useState<string | null>(null);
  const [word, setWord] = useState<string | null>(null);
  const [checked, setChecked] = useState<"correct" | "miss" | "empty" | null>(null);
  const reviewCorrect = picked === REVIEW_QUESTION.answerId;

  function checkWord() {
    if (!word) {
      setChecked("empty");
      return;
    }
    setChecked(word === MEMORY_VERSE.answer ? "correct" : "miss");
  }

  return (
    <section className="grid gap-4" data-testid="mockup-play">
      <ScreenHeading
        kicker={preview.player === "new" ? "First practice · example" : "Review practice · example"}
        title="A review, then a memory verse"
        body={`${guideLine(preview.mascot)} Answers stay on this screen and are not saved.`}
      />
      <div className="grid grid-cols-2 gap-2">
        <a href="#review" className="tap inline-flex items-center justify-center rounded-2xl border border-line bg-card px-2 text-center text-base text-ink">
          Review
        </a>
        <a href="#memory" className="tap inline-flex items-center justify-center rounded-2xl border border-line bg-card px-2 text-center text-base text-ink">
          Memory verse
        </a>
      </div>

      <ExampleCard id="review" className="grid gap-3">
        <div>
          <p className="text-base font-semibold text-gold">Review question · example</p>
          <p className="text-base text-ink-soft">
            {REVIEW_QUESTION.ref} · {REVIEW_QUESTION.translation}
          </p>
          <h2 data-testid="mockup-review-prompt" className="mt-2 text-2xl font-semibold text-ink">
            {reviewPrompt(preview.demographic)}
          </h2>
        </div>
        <div className="grid gap-2" role="group" aria-label="Example answers">
          {REVIEW_QUESTION.choices.map((choice) => {
            const selected = picked === choice.id;
            return (
              <button
                key={choice.id}
                type="button"
                data-testid={`mockup-choice-${choice.id}`}
                aria-pressed={selected}
                onClick={() => setPicked(choice.id)}
                className={`rounded-2xl border px-4 text-left text-lg ${
                  selected ? "border-grove bg-grove font-semibold text-white" : "border-line bg-parchment text-ink"
                }`}
              >
                {choice.text}
              </button>
            );
          })}
        </div>
        {picked ? (
          <div data-testid="mockup-review-feedback">
            <p className="text-lg text-ink">
              {reviewCorrect ? `Example takeaway: ${REVIEW_QUESTION.takeaway}` : REVIEW_QUESTION.hint}
            </p>
            <p className="mt-2 text-lg text-ink">{REVIEW_QUESTION.verse}</p>
            <p className="mt-1 text-base text-ink-soft">
              {REVIEW_QUESTION.ref} · {REVIEW_QUESTION.translation} · example quotation
            </p>
          </div>
        ) : (
          <p className="text-base text-ink-soft">Tap an answer. The example verse appears after you choose.</p>
        )}
      </ExampleCard>

      <ExampleCard id="memory" className="grid gap-3">
        <div>
          <p className="text-base font-semibold text-gold">Memory verse · example</p>
          <p className="text-base text-ink-soft">
            {MEMORY_VERSE.ref} · {MEMORY_VERSE.translation}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-grove-deep">{memoryInstruction(preview.demographic)}</h2>
        </div>
        <p data-testid="mockup-memory-line" className="text-xl leading-relaxed text-ink">
          {MEMORY_VERSE.before}{" "}
          <span className="inline-block min-w-24 border-b-2 border-grove px-2 text-center font-semibold text-grove-deep">
            {word ?? "______"}
          </span>{" "}
          {MEMORY_VERSE.after}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Example word bank">
          {MEMORY_VERSE.bank.map((option) => {
            const selected = word === option;
            return (
              <button
                key={option}
                type="button"
                data-testid={`mockup-word-${option}`}
                aria-pressed={selected}
                onClick={() => {
                  setWord(option);
                  setChecked(null);
                }}
                className={`rounded-2xl border px-4 text-lg ${
                  selected ? "border-grove bg-grove font-semibold text-white" : "border-line bg-parchment text-ink"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          data-testid="mockup-memory-check"
          onClick={checkWord}
          className="rounded-2xl border border-grove px-4 text-lg font-semibold text-grove-deep"
        >
          Check
        </button>
        {checked === "correct" ? (
          <p role="status" data-testid="mockup-memory-feedback" className="text-lg text-ink">
            That matches the example verse: {MEMORY_VERSE.before} {MEMORY_VERSE.answer} {MEMORY_VERSE.after}
          </p>
        ) : null}
        {checked === "miss" ? (
          <p role="status" data-testid="mockup-memory-feedback" className="text-lg text-ink">
            That word is not the one in this example verse. Try another from the bank.
          </p>
        ) : null}
        {checked === "empty" ? (
          <p role="status" data-testid="mockup-memory-feedback" className="text-lg text-ink">
            Choose a word from the example bank first.
          </p>
        ) : null}
      </ExampleCard>

      <Link href={href("/mockup/home")} className="text-center text-base font-semibold text-grove-deep underline">
        Back to Home
      </Link>
    </section>
  );
}
