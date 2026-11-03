import { afterEach, describe, expect, it, vi } from "vitest";
import { mockupsEnabled } from "@/lib/mockup/gate";
import {
  MEMORY_VERSE,
  parsePreview,
  pathBlocks,
  previewQuery,
  reviewPrompt,
  stageStatuses,
  tabFromPath,
  visibleTabs,
  withPreview,
} from "@/lib/mockup/preview";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("mockupsEnabled", () => {
  it("renders in development and on Vercel preview", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("MOCKUPS_ENABLED", "");
    expect(mockupsEnabled()).toBe(true);

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(mockupsEnabled()).toBe(true);

    vi.stubEnv("VERCEL_ENV", "development");
    expect(mockupsEnabled()).toBe(true);
  });

  it("404s in production unless MOCKUPS_ENABLED=1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("MOCKUPS_ENABLED", "");
    expect(mockupsEnabled()).toBe(false);

    vi.stubEnv("MOCKUPS_ENABLED", "true");
    expect(mockupsEnabled()).toBe(false);

    vi.stubEnv("MOCKUPS_ENABLED", "1");
    expect(mockupsEnabled()).toBe(true);
  });
});

describe("mockup preview", () => {
  it("defaults to a new adult with Judah and ignores unknown values", () => {
    const preview = parsePreview({
      get: (name) => ({ mascot: "whale", player: "expert", demo: "baby" })[name] ?? null,
    });
    expect(preview).toEqual({ mascot: "judah", player: "new", demographic: "adult" });
  });

  it("round-trips the control panel query", () => {
    const preview = { mascot: "hunter" as const, player: "progressed" as const, demographic: "teen" as const };
    expect(parsePreview(new URLSearchParams(previewQuery(preview)))).toEqual(preview);
    expect(withPreview("/mockup/play", preview)).toBe("/mockup/play?mascot=hunter&player=progressed&demo=teen");
  });

  it("shows a new player only Home and Path", () => {
    expect(visibleTabs("new")).toEqual(["home", "path"]);
    expect(visibleTabs("progressed")).toEqual(["home", "path", "collection", "groups"]);
  });

  it("marks Seed as here for a new player and Growing for a progressed player", () => {
    expect(stageStatuses("new").find((stage) => stage.status === "here")?.name).toBe("Seed");
    expect(stageStatuses("new").every((stage) => stage.name === "Seed" || stage.status === "ahead")).toBe(true);
    expect(stageStatuses("progressed").filter((stage) => stage.status === "done").map((stage) => stage.name)).toEqual([
      "Seed",
      "Sprout",
      "Rooted",
    ]);
    expect(stageStatuses("progressed").find((stage) => stage.status === "here")?.name).toBe("Growing");
  });

  it("shows only the current stage for a new player, as empty badge slots", () => {
    const blocks = pathBlocks("new");
    expect(blocks.map((block) => block.stage)).toEqual(["Seed"]);
    expect(blocks[0]?.complete).toBe(false);
    expect(blocks[0]?.badges.length).toBeGreaterThan(0);
    expect(blocks[0]?.badges.every((badge) => !badge.filled)).toBe(true);
    expect(blocks[0]?.learning).not.toMatch(/child|teen|adult|older|foundation|intermediate|advanced|expert/i);
  });

  it("stacks earned stages above a partly filled current stage", () => {
    const blocks = pathBlocks("progressed");
    expect(blocks.map((block) => block.stage)).toEqual(["Seed", "Sprout", "Rooted", "Growing"]);
    expect(blocks.slice(0, 3).every((block) => block.complete && block.badges.every((badge) => badge.filled))).toBe(true);
    const growing = blocks[3];
    expect(growing?.complete).toBe(false);
    expect(growing?.badges.some((badge) => badge.filled)).toBe(true);
    expect(growing?.badges.some((badge) => !badge.filled)).toBe(true);
    const jonah = blocks[0]?.badges.find((badge) => badge.id === "jonah");
    expect(jonah).toMatchObject({ art: "fish", filled: true });
  });

  it("knows the practice route is not a tab", () => {
    expect(tabFromPath("/mockup/play")).toBe("play");
    expect(tabFromPath("/mockup/collection")).toBe("collection");
    expect(tabFromPath("/home")).toBeNull();
  });

  it("keeps the example memory word inside the word bank", () => {
    expect(MEMORY_VERSE.bank).toContain(MEMORY_VERSE.answer);
    expect(reviewPrompt("child")).not.toBe(reviewPrompt("adult"));
  });
});
