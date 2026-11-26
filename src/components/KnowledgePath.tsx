import { BADGE_AHEAD_NOTE, mapStageRows, stageSlug } from "@/lib/game/badges";
import { stageIndex } from "@/lib/game/progression";
import type { GameProgress, KnowledgeStage } from "@/lib/game/types";

export function KnowledgePath({
  progress,
  variant = "full",
}: {
  progress: GameProgress;
  /** Home lists only stages already reached. The full list keeps later stages and badge names. */
  variant?: "full" | "reached";
}) {
  const current = stageIndex(progress.stage ?? "Seed");
  const rows = mapStageRows(progress).filter((row) => variant === "full" || !row.ahead);
  return (
    <ol className={variant === "reached" ? "grid gap-1.5" : "grid gap-2"} aria-label="Knowledge Path" data-variant={variant}>
      {rows.map((row) => {
        const here = stageIndex(row.stage) === current;
        return (
          <li
            key={row.stage}
            className={`path-step flex min-w-0 rounded-2xl border px-4 ${
              variant === "reached" ? "items-center py-2" : "flex-col gap-1 py-3"
            } ${here ? "path-step-here border-grove bg-grove text-white" : "border-line bg-card text-ink"}`}
            aria-current={here ? "step" : undefined}
            data-ahead={row.ahead ? "true" : "false"}
            data-testid={`path-stage-${stageSlug(row.stage)}`}
          >
            <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={`h-3.5 w-3.5 shrink-0 rounded-full ${
                    here ? "bg-gold-soft ring-2 ring-white/80" : "bg-gold-soft ring-2 ring-gold/50"
                  }`}
                />
                <span className={`text-lg ${here ? "font-semibold" : ""}`}>{row.stage}</span>
              </span>
              {here ? <span className="text-base sm:ml-auto">You are here</span> : null}
            </span>
            {variant === "full"
              ? row.earned.map((badge) => (
                  <span key={badge.id} className="text-base" data-testid={`earned-badge-${badge.id}`}>
                    {badge.name}
                  </span>
                ))
              : null}
            {variant === "full" && row.ahead ? (
              <span className="text-base" data-testid="path-locked-note">
                {BADGE_AHEAD_NOTE}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export type { KnowledgeStage };
