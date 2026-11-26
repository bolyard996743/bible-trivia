import { badgeProgressRatio, badgesEarnedLabel } from "@/lib/game/badges";

export function BadgeEarnedBar({ earned, total }: { earned: number; total: number }) {
  const label = badgesEarnedLabel(earned, total);
  const ratio = badgeProgressRatio(earned, total);
  return (
    <div className="grid min-w-0 gap-2" data-testid="badge-progress">
      <p className="text-base text-ink">{label}</p>
      <div
        className="h-3 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={earned}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label}
      >
        <span className="block h-full rounded-full bg-grove" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
