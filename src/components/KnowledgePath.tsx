import { BADGE_AHEAD_NOTE, mapStageRows } from "@/lib/game/badges";
import { stageIndex } from "@/lib/game/progression";
import type { GameProgress, KnowledgeStage } from "@/lib/game/types";

export function KnowledgePath({ progress }: { progress: GameProgress }) {
  const rows = mapStageRows(progress);
  const current = stageIndex(progress.stage ?? "Seed");
  return (
    <ol className="grid gap-2" aria-label="Knowledge Path">
      {rows.map((row) => {
        const here = stageIndex(row.stage) === current;
        return (
          <li
            key={row.stage}
            className={`path-step flex min-w-0 flex-col gap-1 rounded-2xl border px-4 py-3 ${
              here ? "path-step-here border-grove bg-grove text-white" : "border-line bg-card text-ink"
            }`}
            aria-current={here ? "step" : undefined}
            data-ahead={row.ahead ? "true" : "false"}
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
            {row.earned.map((badge) => (
              <span key={badge.id} className="text-base" data-testid={`earned-badge-${badge.id}`}>
                {badge.name}
              </span>
            ))}
            {row.ahead ? (
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
