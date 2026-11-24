"use client";

import { useEffect, useRef } from "react";
import { BadgeEmblem } from "@/components/BadgeEmblem";

export function badgeEarnedMessage(name: string): string {
  return `Well done! You earned the ${name} badge.`;
}

export function BadgeEarnedDialog({
  name,
  topic,
  slug,
  onContinue,
}: {
  name: string;
  topic: string;
  slug: string;
  onContinue: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleId = "badge-earned-title";

  useEffect(() => {
    buttonRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onContinue();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onContinue]);

  return (
    <div className="badge-earned-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="badge-earned-dialog"
        className="badge-earned-dialog"
      >
        <div className="badge-earned-pop">
          <BadgeEmblem topic={topic} slug={slug} status="earned" />
        </div>
        <h2 id={titleId} className="text-2xl font-semibold text-grove-deep">
          {badgeEarnedMessage(name)}
        </h2>
        <button
          ref={buttonRef}
          type="button"
          data-testid="badge-earned-continue"
          onClick={onContinue}
          className="tap rounded-2xl bg-grove px-6 text-lg font-semibold text-white"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
