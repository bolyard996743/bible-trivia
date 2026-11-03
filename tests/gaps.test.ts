import fs from "fs";
import { describe, expect, it } from "vitest";
import { renderContentGapReport } from "@/lib/content/gaps";
import { loadCatalog } from "@/lib/content/load";

describe("content gap report", () => {
  it("matches docs/content-gaps.md and keeps Psalm 119 out of Seed", () => {
    const { questions } = loadCatalog();
    const report = `${renderContentGapReport(questions)}\n`;
    expect(fs.readFileSync("docs/content-gaps.md", "utf8")).toBe(report);
    expect(report).toContain("## Seed");
    expect(report).toContain("## Deep Roots");
    const seed = report.slice(report.indexOf("## Seed"), report.indexOf("## Sprout"));
    expect(seed).not.toContain("Psalm 119");
    expect(report).toContain("| Psalm 119 |");
    expect(report.indexOf("| Psalm 119 |")).toBeGreaterThan(report.indexOf("## Established"));
  });
});