import { describe, expect, it } from "vitest";
import { TEXT_PAIRS, THEME_IDS, THEMES, contrastRatio, themeForMascot } from "@/lib/theme";

describe("mascot themes", () => {
  it("keeps every text and background pair at WCAG AA", () => {
    for (const theme of THEME_IDS) {
      const colors = THEMES[theme];
      for (const pair of TEXT_PAIRS) {
        const ratio = contrastRatio(colors[pair.fg], colors[pair.bg]);
        expect(ratio, `${theme} ${pair.name} ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(pair.minimum);
      }
    }
  });

  it("maps each mascot and falls back when none is chosen", () => {
    expect(themeForMascot("hunter")).toBe("hunter");
    expect(themeForMascot("agnes")).toBe("agnes");
    expect(themeForMascot("judah")).toBe("judah");
    expect(themeForMascot("zion")).toBe("zion");
    expect(themeForMascot("shalom")).toBe("shalom");
    expect(themeForMascot(null)).toBe("default");
    expect(themeForMascot(undefined)).toBe("default");
  });
});
