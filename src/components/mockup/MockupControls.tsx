"use client";

import { AGE_GROUPS, MASCOT_IDS, MASCOTS } from "@/lib/game/types";
import { PLAYER_STATES, demographicLabel } from "@/lib/mockup/preview";
import { ProfileIcon } from "./ProfileIcon";
import { usePreview } from "./preview-context";

export function MockupControls({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { preview, setMascot, setPlayer, setDemographic } = usePreview();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-center bg-[rgba(36,28,20,0.45)] px-3 pt-4"
      role="presentation"
      onClick={onClose}
    >
      <div className="w-full max-w-[398px]" onClick={(event) => event.stopPropagation()}>
          <section
            id="mockup-controls"
            role="dialog"
            aria-modal="true"
            aria-label="Preview controls"
            data-testid="mockup-controls"
            className="max-h-[min(40rem,88dvh)] w-full overflow-y-auto rounded-3xl border border-line bg-card p-4 shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-grove-deep">Preview controls</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-line bg-parchment px-4 text-base text-ink"
              >
                Close
              </button>
            </div>

            <fieldset className="grid gap-2">
              <legend className="text-base font-semibold text-ink">Mascot</legend>
              <div className="grid grid-cols-3 gap-2">
                {MASCOT_IDS.map((id) => {
                  const selected = preview.mascot === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      data-testid={`mockup-mascot-${id}`}
                      aria-pressed={selected}
                      aria-label={MASCOTS[id].name}
                      onClick={() => setMascot(id)}
                      className={`flex w-full flex-col items-center justify-center gap-1 rounded-2xl border px-1 text-sm ${
                        selected ? "border-grove bg-grove font-semibold text-white" : "border-line bg-parchment text-ink"
                      }`}
                    >
                      <ProfileIcon mascot={id} size="sm" />
                      <span>{MASCOTS[id].name.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-4 grid gap-2">
              <legend className="text-base font-semibold text-ink">Player state</legend>
              <div className="grid grid-cols-2 gap-2">
                {PLAYER_STATES.map((player) => {
                  const selected = preview.player === player;
                  return (
                    <button
                      key={player}
                      type="button"
                      data-testid={`mockup-player-${player}`}
                      aria-pressed={selected}
                      onClick={() => setPlayer(player)}
                      className={`rounded-2xl border px-3 text-base ${
                        selected ? "border-grove bg-grove font-semibold text-white" : "border-line bg-parchment text-ink"
                      }`}
                    >
                      {player === "new" ? "New" : "Progressed"}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-4 grid gap-2">
              <legend className="text-base font-semibold text-ink">Demographic</legend>
              <div className="grid grid-cols-2 gap-2">
                {AGE_GROUPS.map((demographic) => {
                  const selected = preview.demographic === demographic;
                  return (
                    <button
                      key={demographic}
                      type="button"
                      data-testid={`mockup-demo-${demographic}`}
                      aria-pressed={selected}
                      onClick={() => setDemographic(demographic)}
                      className={`rounded-2xl border px-3 text-base ${
                        selected ? "border-grove bg-grove font-semibold text-white" : "border-line bg-parchment text-ink"
                      }`}
                    >
                      {demographicLabel(demographic)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <p className="mt-4 text-base text-ink-soft">
              Example only. These switches change this preview. They do not write to the database.
            </p>
          </section>
      </div>
    </div>
  );
}
