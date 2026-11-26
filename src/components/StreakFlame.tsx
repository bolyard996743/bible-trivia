/** A quiet count of correct answers in this badge attempt. Zero renders nothing. */
export function StreakFlame({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <p data-testid="attempt-streak" className="inline-flex items-center gap-1 text-base font-semibold text-gold" aria-label={`${count} correct in a row`}>
      <svg viewBox="0 0 16 20" className="h-5 w-4" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8 0c.4 2.6 2.2 4 2.6 6.2.3 1.4-.2 2.4-1 3 1.4-.4 3.4-1.8 3.8-4.2.8 1.6 1.6 3.2 1.6 5.2A7 7 0 0 1 8 17a7 7 0 0 1-7-6.8c0-2.4 1.2-4.2 2.4-5.6C4.6 6.2 6 7.4 6.4 8.6 6.6 5.8 7.2 3.2 8 0z"
        />
      </svg>
      <span aria-hidden="true">{count}</span>
    </p>
  );
}
