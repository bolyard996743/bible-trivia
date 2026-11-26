import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { COMBO_KEY, COMBO_MAX, applyCombo, comboLevel, readCombo, writeCombo } from "@/lib/play/combo";

function memory(initial: string | null = null) {
  let value = initial;
  return {
    getItem() {
      return value;
    },
    setItem(_key: string, next: string) {
      value = next;
    },
    raw() {
      return value;
    },
  };
}

describe("combo meter", () => {
  it("grows on correct answers, clears on a miss, and does not change a score", () => {
    expect(applyCombo(0, true)).toBe(1);
    expect(applyCombo(3, true)).toBe(4);
    expect(applyCombo(COMBO_MAX, true)).toBe(COMBO_MAX);
    expect(applyCombo(4, false)).toBe(0);
    expect(applyCombo(0, false)).toBe(0);
    expect(comboLevel(-3)).toBe(0);
    expect(comboLevel(Number.NaN)).toBe(0);
    expect(comboLevel(9)).toBe(COMBO_MAX);

    const storage = memory();
    expect(readCombo(storage)).toBe(0);
    expect(writeCombo(storage, applyCombo(0, true))).toBe(1);
    expect(writeCombo(storage, applyCombo(1, false))).toBe(0);
    expect(storage.raw()).toBe("0");
    expect(storage.raw()).not.toMatch(/miss|wrong|streak|points/i);
    storage.setItem(COMBO_KEY, "nope");
    expect(readCombo(storage)).toBe(0);

    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain('.question-card[data-combo="1"].bg-card');
    expect(css).toContain('.question-card[data-combo="6"].bg-card');
    expect(css).not.toMatch(/combo-break|combo-lost|combo-miss/);
    const allowed = css.slice(
      css.indexOf("@media (prefers-reduced-motion: no-preference)"),
      css.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    expect(allowed).toContain(".question-card");
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain(".question-card");
    expect(reduced).toContain("animation: none");
    expect(reduced).toContain("transition: none");
  });
});
