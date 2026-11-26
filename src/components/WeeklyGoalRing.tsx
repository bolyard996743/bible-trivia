import { WEEKLY_GOAL, goalFill, goalLabelCount } from "@/lib/play/weekly-goal";

export function WeeklyGoalRing({
  count,
  goal = WEEKLY_GOAL,
  reducedMotion = false,
}: {
  count: number;
  goal?: number;
  reducedMotion?: boolean;
}) {
  const size = 64;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const fill = goalFill(count, goal);
  const shown = goalLabelCount(count, goal);
  return (
    <div className="flex min-w-0 items-center gap-3" data-testid="weekly-goal" data-count={count} data-fill={fill.toFixed(2)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={reducedMotion ? "weekly-goal-still shrink-0" : "weekly-goal-ring shrink-0"}
        data-reduced={reducedMotion ? "true" : "false"}
        aria-hidden="true"
      >
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--grove)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fill)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <p className="min-w-0 text-lg text-ink">
        <span className="font-semibold text-grove-deep">
          {shown} of {goal}
        </span>
        <span className="block text-base text-ink-soft">questions this week</span>
      </p>
    </div>
  );
}
