import fs from "fs";
import path from "path";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) =>
    createElement("a", { ...props, href }, children),
}));

import { BadgeEarnedDialog, badgeEarnedMessage } from "@/components/BadgeEarnedDialog";
import { StageMap } from "@/components/StageMap";
import { badgeEarned, badgeJustEarned, badgeStatusLabel } from "@/lib/game/badges";
import { recordBadgeAnswer } from "@/lib/game/badge-retry";
import { badgeLook, FALLBACK_ICON, FALLBACK_PALETTE_ID } from "@/lib/game/badge-look";
import { badgeAttention, markBadgesSeen, noticePlan, readSeenBadges, writeSeenBadges } from "@/lib/game/badge-seen";
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

  it("gives Fruitful badges a fitting icon instead of one generic scroll", () => {
    const fruitful = knowledgePath.stages.find((stage) => stage.stage === "Fruitful");
    const badges = (fruitful?.badges ?? []).filter((badge) => badge.questionIds.length > 0);
    expect(badges).toHaveLength(69);
    expect(badges.some((badge) => badge.id === "fruitful-song-of-solomon")).toBe(true);
    const looks = badges.map((badge) => badgeLook(badge.art, badge.id));
    expect(looks.every((look) => look.fallback === false)).toBe(true);
    expect(badgeLook("scroll", "fruitful-song-of-solomon")).toMatchObject({ icon: "heart", fallback: false });
    expect(badgeLook("scroll", "fruitful-psalms-wisdom-psalms").icon).toBe("harp");
    expect(badgeLook("scroll", "fruitful-1-chronicles-davids-kingdom-established").icon).toBe("crown");
    expect(badgeLook("scroll", "fruitful-2-corinthians-pauls-ministry-and-defense").icon).toBe("letter");
    expect(badgeLook("scroll", "fruitful-james-wealth-patience-and-prayer").icon).toBe("letter");
    expect(badgeLook("scroll", "fruitful-1-peter-suffering-and-submission").icon).toBe("letter");
    expect(badgeLook("scroll", "fruitful-1-john-test-the-spirits").icon).toBe("scroll");
    expect(badgeLook("scroll", "fruitful-ephesians-walk-worthy").icon).toBe("letter");
    expect(badgeLook("banner", "fruitful-jude").icon).toBe("scroll");
    const scrolls = looks.filter((look) => look.icon === "scroll");
    expect(scrolls.length).toBeLessThan(badges.length / 2);
  });

  it("gives shared scroll badges different rings", () => {
    const scrolls = knowledgePath.stages.flatMap((stage) => stage.badges).filter((badge) => badge.art === "scroll");
    expect(scrolls.length).toBeGreaterThan(10);
    const rings = new Set(scrolls.map((badge) => badgeLook(badge.art, badge.id).palette.ringFrom));
    expect(rings.size).toBeGreaterThan(30);
  });
});

function badgeSlice(html: string, id: string): string {
  const start = html.indexOf(`data-testid="${id}"`);
  const next = html.indexOf('data-testid="badge-', start + 10);
  return html.slice(start, next === -1 ? undefined : next);
}

describe("stage map hides badges the player has not reached", () => {
  it("renders only the reached stage, with a blank unearned circle and a clock when waiting", () => {
    const creation = knowledgePath.stages[0]?.badges.find((badge) => badge.id === "seed-creation");
    expect(creation?.questionIds.length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(
      createElement(StageMap, {
        now: new Date("2026-11-24T12:00:00.000Z"),
        seenBadgeIds: ["seed-creation"],
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
    expect(html).not.toContain('data-chip="check"');
    expect(html).toContain('data-chip="clock"');
    expect(html).toContain('data-chip="lock"');
    expect(html).toContain("Creation, earned");
    expect(html).toContain("Noah, not earned yet");
    expect(html).toContain("Jonah, not earned yet. Locked for 24 hours");
    expect(html).toContain("Unlocks after you earn every badge before it");
    const noah = badgeSlice(html, "badge-seed-noah");
    expect(noah).toContain(">Noah<");
    expect(noah).toContain('data-icon="ark"');
    expect(noah).toContain("<svg");
    expect(noah).toContain("map-unearned");
    expect(noah).toContain('href="/play?badge=seed-noah"');
    expect(noah).not.toContain('data-chip="lock"');
    expect(noah).not.toContain('data-chip="clock"');
    const jonah = badgeSlice(html, "badge-seed-jonah");
    expect(jonah).toContain('data-icon="fish"');
    expect(jonah).toContain("map-unearned");
    expect(jonah).toContain('data-chip="clock"');
    expect(jonah).toContain('href="/play?badge=seed-jonah"');
    const earned = badgeSlice(html, "badge-seed-creation");
    expect(earned).toContain('data-icon="creation"');
    expect(earned).not.toContain("map-unearned");
    expect(earned).not.toContain("data-chip");
    expect(earned).toContain('href="/play?badge=seed-creation"');
    expect(html).toContain('data-testid="stage-count-seed"');
    expect(html).toContain(">1 of 9<");
    expect(html).not.toContain('data-testid="stage-count-fruitful"');
    expect(html).not.toContain('data-testid="stage-count-deep-roots"');
    const ahead = badgeSlice(html, "badge-fruitful-jude");
    expect(ahead).toContain('data-state="sealed"');
    expect(ahead).toContain('data-chip="lock"');
    expect(ahead).toContain("map-unearned");
    expect(ahead).not.toContain("href=");
    expect(ahead).not.toContain("<a ");
    expect(ahead).not.toContain("<button");
    expect(ahead.toLowerCase()).not.toMatch(/\b(difficulty|easy|intermediate|advanced|expert|ages?)\b/);
    expect(html).toContain("stage-block-fruitful");
    expect(html).toContain("stage-block-deep-roots");
    expect(html).toContain('data-place="locked"');
    for (const chunk of html.split('data-testid="badge-').slice(1)) {
      const state = /data-state="([^"]+)"/.exec(chunk)?.[1];
      if (!state) continue;
      if (state === "earned") {
        expect(chunk).not.toContain("map-unearned");
      } else {
        expect(chunk, state).toContain("map-unearned");
      }
      if (state === "sealed") expect(chunk).not.toContain('href="/play?badge=');
      if (state === "empty" || state === "locked") expect(chunk).toContain('href="/play?badge=');
    }
    expect(badgeStatusLabel("Creation", "earned")).toBe("Creation, earned");
    expect(badgeStatusLabel("Creation", "empty")).toBe("Creation, not earned yet");
    expect(badgeStatusLabel("Creation", "locked")).toBe("Creation, not earned yet. Locked for 24 hours");
  });

  it("still stops the map at Established", () => {
    const html = renderToStaticMarkup(
      createElement(StageMap, {
        progress: { ...emptyProgress(), stage: "Established" },
      }),
    );
    expect(html).toContain("stage-block-established");
    expect(html).toContain("badge-seed-creation");
    expect(html).toContain('data-testid="stage-count-seed"');
    expect(html).toContain('data-testid="stage-count-established"');
    expect(html).toContain("stage-block-fruitful");
    expect(html).toContain("stage-block-deep-roots");
    expect(html).not.toContain('data-testid="stage-count-fruitful"');
    expect(html).not.toContain('data-testid="stage-count-deep-roots"');
    expect(html).toContain('data-place="locked"');
    expect(html).toContain("Unlocks after you earn every badge before it");
    const lockedStage = html.slice(html.indexOf('data-testid="stage-block-fruitful"'), html.indexOf('data-testid="stage-block-deep-roots"'));
    expect(lockedStage).toContain("map-unearned");
    expect(lockedStage).toContain('data-chip="lock"');
    expect(lockedStage).not.toContain('href="/play?badge=');
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const faded = css.match(/\.map-unearned \.badge-art\s*\{[^}]+\}/)?.[0] ?? "";
    expect(faded).toContain("grayscale(1)");
    expect(faded).toContain("opacity: 0.7");
    expect(faded).not.toContain("animation");
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain(".badge-flash");
    expect(reduced).toContain("animation: none");
  });
});

describe("a new badge is noticed once", () => {
  it("flashes the first time, then never again", () => {
    expect(badgeAttention(true, false, false)).toBe("flash");
    const first = noticePlan(null, ["seed-creation"]);
    expect(first.attentionIds).toEqual([]);
    expect(first.seen).toEqual(["seed-creation"]);
    const next = noticePlan(first.seen, ["seed-creation", "seed-noah"]);
    expect(next.attentionIds).toEqual(["seed-noah"]);
    expect(badgeAttention(true, false, false)).toBe("flash");
    const seen = markBadgesSeen(next.seen, next.attentionIds);
    expect(seen).toEqual(["seed-creation", "seed-noah"]);
    expect(noticePlan(seen, ["seed-creation", "seed-noah"]).attentionIds).toEqual([]);
    expect(badgeAttention(true, seen.includes("seed-noah"), false)).toBe("none");
  });

  it("uses a static glow when motion is reduced", () => {
    expect(badgeAttention(true, false, true)).toBe("glow");
    expect(badgeAttention(false, false, true)).toBe("none");
    const html = renderToStaticMarkup(
      createElement(StageMap, {
        reducedMotion: true,
        seenBadgeIds: [],
        progress: {
          ...emptyProgress(),
          stage: "Seed",
          badgeRetries: {
            "seed-creation": {
              correctIds: knowledgePath.stages[0]?.badges.find((badge) => badge.id === "seed-creation")?.questionIds ?? [],
            },
          },
        },
      }),
    );
    const earned = badgeSlice(html, "badge-seed-creation");
    expect(earned).toContain('data-attention="glow"');
    expect(earned).toContain("badge-glow");
    expect(earned).not.toContain("badge-flash");
    const noah = badgeSlice(html, "badge-seed-noah");
    expect(noah).not.toContain("data-attention");
  });

  it("remembers seen badges for one player without touching another", () => {
    const storage = {
      value: null as string | null,
      getItem() {
        return this.value;
      },
      setItem(_key: string, next: string) {
        this.value = next;
      },
    };
    expect(readSeenBadges(storage, "local")).toEqual([]);
    writeSeenBadges(storage, "local", ["seed-noah"]);
    writeSeenBadges(storage, "ada@example.com", ["seed-creation"]);
    expect(readSeenBadges(storage, "local")).toEqual(["seed-noah"]);
    expect(readSeenBadges(storage, "ada@example.com")).toEqual(["seed-creation"]);
    expect(badgeAttention(true, readSeenBadges(storage, "local").includes("seed-noah"), false)).toBe("none");
    expect(badgeAttention(true, readSeenBadges(storage, "local").includes("seed-creation"), false)).toBe("flash");
  });
});

describe("earning a badge", () => {
  it("shows the congratulations moment only when the badge is first earned", () => {
    const badge = { id: "seed-creation", name: "Creation", art: "creation", questionIds: ["q1"] };
    const before = emptyProgress();
    const after = recordBadgeAnswer(before, badge, "q1", true, new Date("2026-11-24T12:00:00.000Z"));
    expect(badgeJustEarned(badgeEarned(before, badge), badgeEarned(after, badge))).toBe(true);
    expect(badgeJustEarned(true, badgeEarned(after, badge))).toBe(false);

    const html = renderToStaticMarkup(
      createElement(BadgeEarnedDialog, {
        name: badge.name,
        topic: badge.art,
        slug: badge.id,
        mascot: "judah",
        onContinue: () => undefined,
      }),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain(badgeEarnedMessage("Creation"));
    expect(html).toContain("Well done! You earned the Creation badge.");
    expect(html).toContain("Continue");
    expect(html).toContain('data-icon="creation"');
    expect(html).not.toContain('data-chip="check"');
    expect(html.toLowerCase()).not.toMatch(/\b(seed|sprout|rooted|growing|established|fruitful|difficulty|easy|intermediate|advanced|expert|age)\b/);
  });
});
