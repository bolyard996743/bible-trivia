import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) =>
    createElement("a", { ...props, href }, children),
}));

import { StageMap } from "@/components/StageMap";
import { badgeStatusLabel } from "@/lib/game/badges";
import { badgeLook, FALLBACK_ICON, FALLBACK_PALETTE_ID } from "@/lib/game/badge-look";
import { knowledgePath } from "@/lib/game/path";
import { emptyProgress } from "@/lib/game/progression";

describe("badge icon and palette mapping", () => {
  it("maps story topics onto their own icons and palettes", () => {
    expect(badgeLook("creation")).toMatchObject({ icon: "creation", fallback: false, palette: { id: "sunrise" } });
    expect(badgeLook("noah")).toMatchObject({ icon: "ark", palette: { id: "flood" } });
    expect(badgeLook("daniel")).toMatchObject({ icon: "lion", palette: { id: "lion" } });
    expect(badgeLook("dove").icon).toBe("dove");
    expect(badgeLook("cross-resurrection").icon).toBe("cross");
    expect(badgeLook("scroll").icon).toBe("scroll");
    expect(badgeLook("wall").icon).toBe("wall");
    expect(badgeLook("crown").icon).toBe("crown");
    expect(badgeLook("sheep").icon).toBe("shepherd");
    expect(badgeLook("jonah").icon).toBe("fish");
    expect(badgeLook("miracles").icon).toBe("bread");
    expect(badgeLook("lamp").icon).toBe("lamp");
  });

  it("uses the topic, then the badge id, then one fallback", () => {
    expect(badgeLook("missing-art", "seed-noah")).toMatchObject({ icon: "ark", fallback: false });

    const unknown = badgeLook("not-a-real-topic");
    expect(unknown.fallback).toBe(true);
    expect(unknown.icon).toBe(FALLBACK_ICON);
    expect(unknown.palette.id).toBe(FALLBACK_PALETTE_ID);

    const withSlug = badgeLook("not-a-real-topic", "future-badge");
    expect(withSlug.fallback).toBe(true);
    expect(withSlug.icon).toBe(FALLBACK_ICON);
    expect(withSlug.palette.id).toBe(FALLBACK_PALETTE_ID);
    expect(withSlug.palette.ringFrom).toBe(unknown.palette.ringFrom);
  });

  it("keeps a mapped look for every art key already on the path", () => {
    const arts = new Set(knowledgePath.stages.flatMap((stage) => stage.badges.map((badge) => badge.art)));
    expect(arts.size).toBeGreaterThan(20);
    for (const art of arts) {
      expect(badgeLook(art).fallback, art).toBe(false);
    }
  });

  it("gives shared scroll badges different rings", () => {
    const scrolls = knowledgePath.stages.flatMap((stage) => stage.badges).filter((badge) => badge.art === "scroll");
    expect(scrolls.length).toBeGreaterThan(10);
    const rings = new Set(scrolls.map((badge) => badgeLook(badge.art, badge.id).palette.ringFrom));
    expect(rings.size).toBeGreaterThan(30);
  });
});

describe("stage map hides badges the player has not reached", () => {
  it("renders only the reached stage, with earned, empty, and locked chips", () => {
    const creation = knowledgePath.stages[0]?.badges.find((badge) => badge.id === "seed-creation");
    expect(creation?.questionIds.length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(
      createElement(StageMap, {
        now: new Date("2026-11-24T12:00:00.000Z"),
        progress: {
          ...emptyProgress(),
          stage: "Seed",
          badgeRetries: {
            "seed-creation": { correctIds: [...(creation?.questionIds ?? [])] },
            "seed-jonah": { correctIds: [], retryAt: "2099-01-01T00:00:00.000Z" },
          },
        },
      }),
    );

    expect(html).toContain('data-testid="badge-seed-creation"');
    expect(html).toContain('data-testid="badge-seed-noah"');
    expect(html).toContain('data-state="earned"');
    expect(html).toContain('data-state="empty"');
    expect(html).toContain('data-state="locked"');
    expect(html).toContain('data-chip="check"');
    expect(html).toContain('data-chip="lock"');
    expect(html).toContain('data-chip="clock"');
    expect(html).toContain("Creation. Earned");
    expect(html).toContain("Noah. Not earned yet");
    expect(html).toContain("Jonah. Not earned yet. Locked for 24 hours");
    expect(html).toContain('aria-label="Earned"');
    expect(html).toContain('aria-label="Not earned yet"');
    expect(html).toContain('aria-label="Locked for 24 hours"');
    expect(html).not.toContain("badge-sprout-");
    expect(html).not.toContain("stage-block-sprout");
    expect(html).not.toContain("stage-block-fruitful");
    expect(html).not.toContain("stage-block-deep-roots");
    expect(html).not.toContain("Fruitful");
    expect(html).not.toContain("Deep Roots");
    expect(badgeStatusLabel("Creation", "earned")).toBe("Creation. Earned");
    expect(badgeStatusLabel("Creation", "empty")).toBe("Creation. Not earned yet");
    expect(badgeStatusLabel("Creation", "locked")).toBe("Creation. Not earned yet. Locked for 24 hours");
  });

  it("still stops the map at Established", () => {
    const html = renderToStaticMarkup(
      createElement(StageMap, {
        progress: { ...emptyProgress(), stage: "Established" },
      }),
    );
    expect(html).toContain("stage-block-established");
    expect(html).toContain("badge-seed-creation");
    expect(html).not.toContain("stage-block-fruitful");
    expect(html).not.toContain("stage-block-deep-roots");
    expect(html).not.toContain("Fruitful");
    expect(html).not.toContain("Deep Roots");
  });
});
