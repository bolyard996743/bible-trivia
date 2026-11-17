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
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
              here ? "border-grove bg-grove text-white" : "border-line bg-card text-ink-soft"
            }`}
            aria-current={here ? "step" : undefined}
          >
            <span className={`h-3 w-3 shrink-0 rounded-full ${here ? "bg-gold-soft" : "bg-line"}`} />
            <span className={`text-lg ${here ? "font-semibold" : ""}`}>{name}</span>
            {here ? <span className="ml-auto text-base">You are here</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
