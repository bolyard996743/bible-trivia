import { visibleMapStages } from "@/lib/game/badges";
import { stageIndex } from "@/lib/game/progression";
import type { KnowledgeStage } from "@/lib/game/types";

export function KnowledgePath({ stage }: { stage: KnowledgeStage }) {
  const stages = visibleMapStages({ stage });
  const current = stageIndex(stage);
  return (
    <ol className="grid gap-2" aria-label="Knowledge Path">
      {stages.map((name) => {
        const index = stageIndex(name);
        const here = index === current;
        return (
          <li
            key={name}
            className={`path-step flex items-center gap-3 rounded-2xl border px-4 py-3 ${
              here ? "path-step-here border-grove bg-grove text-white" : "border-line bg-card text-ink"
            }`}
            aria-current={here ? "step" : undefined}
          >
            <span
              className={`h-3.5 w-3.5 shrink-0 rounded-full ${
                here ? "bg-gold-soft ring-2 ring-white/80" : "bg-gold-soft ring-2 ring-gold/50"
              }`}
            />
            <span className={`text-lg ${here ? "font-semibold" : ""}`}>{name}</span>
            {here ? <span className="ml-auto text-base">You are here</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
