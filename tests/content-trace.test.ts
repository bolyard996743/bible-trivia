import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";
import { contentTraceGaps } from "../scripts/check-content-trace";

describe("play content file trace", () => {
  it("includes the content tree for every server route", () => {
    expect(nextConfig.outputFileTracingIncludes).toEqual({
      "/*": ["./content/**/*"],
    });
  });

  it("fails when a trace omits question or mascot files", () => {
    expect(contentTraceGaps([])).toEqual(["content/questions", "content/mascots"]);
    expect(contentTraceGaps(["../../content/questions/c1-genesis-001.json"])).toEqual([
      "content/mascots",
    ]);
    expect(
      contentTraceGaps([
        "../../content/questions/c1-genesis-001.json",
        "../../content/mascots/judah-seed-001.json",
      ]),
    ).toEqual([]);
    expect(contentTraceGaps(["content/questions", "content/mascots"])).toEqual([
      "content/questions",
      "content/mascots",
    ]);
  });
});
