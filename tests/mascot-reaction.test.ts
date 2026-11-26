import fs from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MascotMark } from "@/components/MascotMark";
import { MASCOT_IDS } from "@/lib/game/types";
import { MASCOT_CELEBRATION } from "@/lib/play/mascot-celebration";
import { playReaction, reactionClass, reactionMotion } from "@/lib/play/mascot-reaction";

describe("mascot reactions during play", () => {
  it("leans while answering, cheers on a correct answer, and stays still on a miss", () => {
    expect(playReaction("asking", false)).toBe("lean");
    expect(playReaction("mastered", false)).toBe("cheer");
    expect(playReaction("teaching", false)).toBe("still");
    expect(playReaction("asking", true)).toBe("still");
    expect(playReaction("mastered", true)).toBe("still");
    expect(playReaction("teaching", true)).toBe("still");
    expect(reactionMotion("lean")).toBe("lean");
    expect(reactionMotion("cheer")).toBe("correct");
    expect(reactionMotion("still")).toBe("still");

    for (const id of MASCOT_IDS) {
      expect(reactionClass("cheer", id)).toBe(MASCOT_CELEBRATION[id]);
      expect(reactionClass("lean", id)).toBe("mascot-lean");
      expect(reactionClass("still", id)).toBe("");
    }

    const lean = renderToStaticMarkup(createElement(MascotMark, { mascot: "judah", motion: "lean" }));
    expect(lean).toContain("mascot-lean");
    expect(lean).toContain('data-celebration="lean"');
    expect(lean).not.toContain("mascot-flourish");
    expect(lean.toLowerCase()).not.toMatch(/shame|sad|wrong/);

    const cheer = renderToStaticMarkup(createElement(MascotMark, { mascot: "judah", motion: "correct" }));
    expect(cheer).toContain("mascot-roar");
    expect(cheer).toContain('data-celebration="judah"');

    const miss = renderToStaticMarkup(createElement(MascotMark, { mascot: "shalom" }));
    expect(miss).toContain('data-celebration="still"');
    expect(miss).not.toContain("mascot-lean");
    expect(miss).not.toContain("mascot-flutter");

    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const allowed = css.slice(
      css.indexOf("@media (prefers-reduced-motion: no-preference)"),
      css.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    expect(allowed).toContain(".mascot-lean");
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain(".mascot-lean");
    expect(reduced).toContain("animation: none");
  });
});
