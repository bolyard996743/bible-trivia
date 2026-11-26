import fs from "fs";
import path from "path";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) =>
    createElement("a", { ...props, href }, children),
}));

import { StageMap } from "@/components/StageMap";
import { emptyProgress } from "@/lib/game/progression";
import { SEASONAL_THEMES_ENABLED, easterSunday, seasonFor } from "@/lib/season";

function mapOn(iso: string) {
  return renderToStaticMarkup(
    createElement(StageMap, {
      progress: emptyProgress(),
      seenBadgeIds: [],
      reducedMotion: true,
      now: new Date(iso),
    }),
  );
}

describe("seasonal stage map", () => {
  it("uses December for Christmas and a computed Easter window, and one flag turns both off", () => {
    expect(easterSunday(2024)).toEqual({ year: 2024, month: 3, day: 31 });
    expect(easterSunday(2025)).toEqual({ year: 2025, month: 4, day: 20 });
    expect(easterSunday(2026)).toEqual({ year: 2026, month: 4, day: 5 });
    expect(easterSunday(2027)).toEqual({ year: 2027, month: 3, day: 28 });

    expect(seasonFor(new Date("2026-12-01T08:00:00.000Z"))).toBe("christmas");
    expect(seasonFor(new Date("2026-12-31T08:00:00.000Z"))).toBe("christmas");
    expect(seasonFor(new Date("2026-11-30T08:00:00.000Z"))).toBe("none");
    expect(seasonFor(new Date("2027-01-01T08:00:00.000Z"))).toBe("none");

    expect(seasonFor(new Date("2026-03-28T18:00:00.000Z"))).toBe("none");
    expect(seasonFor(new Date("2026-03-29T18:00:00.000Z"))).toBe("easter");
    expect(seasonFor(new Date("2026-04-05T18:00:00.000Z"))).toBe("easter");
    expect(seasonFor(new Date("2026-04-06T18:00:00.000Z"))).toBe("none");

    expect(SEASONAL_THEMES_ENABLED).toBe(true);
    expect(seasonFor(new Date("2026-12-15T20:00:00.000Z"), false)).toBe("none");
    expect(seasonFor(new Date("2026-04-05T18:00:00.000Z"), false)).toBe("none");

    const christmas = mapOn("2026-12-15T20:00:00.000Z");
    expect(christmas).toContain('data-season="christmas"');
    expect(christmas).toContain("season-christmas");
    const easter = mapOn("2026-04-05T18:00:00.000Z");
    expect(easter).toContain('data-season="easter"');
    expect(easter).toContain("season-easter");
    const ordinary = mapOn("2026-06-15T18:00:00.000Z");
    expect(ordinary).toContain('data-season="none"');
    expect(ordinary).not.toContain("season-christmas");
    expect(ordinary).not.toContain("season-easter");

    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain(".season-christmas .stage-card");
    expect(reduced).toContain(".season-easter .stage-card");
    expect(reduced).toContain("animation: none");
    expect(css).not.toMatch(/merry christmas|happy easter/i);
  });
});
