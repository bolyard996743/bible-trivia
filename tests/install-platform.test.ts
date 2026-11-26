import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  INSTALL_DISMISS_KEY,
  detectInstallPlatform,
  readInstallBannerDismissed,
  writeInstallBannerDismissed,
} from "@/lib/installPlatform";

const IOS_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IOS_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.108 Mobile/15E148 Safari/604.1";
const IOS_FIREFOX =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15";
const IOS_EDGE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/126.0.2592.87 Mobile/15E148 Safari/605.1.15";
const IOS_INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 340.0.0.0.0";
const IOS_FACEBOOK =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0.0.0.0;]";
const IOS_LINE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Line/14.0.0";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.122 Mobile Safari/537.36";
const SAMSUNG =
  "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/120.0.0.0 Mobile Safari/537.36";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const DESKTOP_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const IPAD_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

describe("detectInstallPlatform", () => {
  it("recognizes iOS Safari, including an iPad that reports as a Mac", () => {
    expect(detectInstallPlatform({ userAgent: IOS_SAFARI })).toBe("ios-safari");
    expect(detectInstallPlatform({ userAgent: IPAD_SAFARI, maxTouchPoints: 5 })).toBe("ios-safari");
  });

  it("sends iOS Chrome, Firefox, Edge, and in-app browsers to Safari first", () => {
    expect(detectInstallPlatform({ userAgent: IOS_CHROME })).toBe("ios-other");
    expect(detectInstallPlatform({ userAgent: IOS_FIREFOX })).toBe("ios-other");
    expect(detectInstallPlatform({ userAgent: IOS_EDGE })).toBe("ios-other");
    expect(detectInstallPlatform({ userAgent: IOS_INSTAGRAM })).toBe("ios-other");
    expect(detectInstallPlatform({ userAgent: IOS_FACEBOOK })).toBe("ios-other");
    expect(detectInstallPlatform({ userAgent: IOS_LINE })).toBe("ios-other");
  });

  it("recognizes Android Chrome and Samsung Internet separately from desktop", () => {
    expect(detectInstallPlatform({ userAgent: ANDROID_CHROME })).toBe("android-chrome");
    expect(detectInstallPlatform({ userAgent: SAMSUNG })).toBe("samsung");
    expect(detectInstallPlatform({ userAgent: DESKTOP_CHROME })).toBe("other");
    expect(detectInstallPlatform({ userAgent: DESKTOP_SAFARI, maxTouchPoints: 0 })).toBe("other");
  });

  it("treats an installed app as standalone before the user agent", () => {
    expect(detectInstallPlatform({ userAgent: IOS_SAFARI, navigatorStandalone: true })).toBe("standalone");
    expect(detectInstallPlatform({ userAgent: ANDROID_CHROME, displayModeStandalone: true })).toBe("standalone");
    expect(detectInstallPlatform({ userAgent: DESKTOP_CHROME, displayModeStandalone: true })).toBe("standalone");
  });
});

describe("install banner dismissal", () => {
  it("remembers a dismissal and ignores blocked storage", () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value);
      },
    };
    expect(readInstallBannerDismissed(storage)).toBe(false);
    writeInstallBannerDismissed(storage);
    expect(saved.get(INSTALL_DISMISS_KEY)).toBe("1");
    expect(readInstallBannerDismissed(storage)).toBe(true);

    const blocked = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };
    expect(readInstallBannerDismissed(blocked)).toBe(false);
    expect(() => writeInstallBannerDismissed(blocked)).not.toThrow();
  });
});

describe("service worker stays a no-op", () => {
  it("does not cache responses and is not cached for long", () => {
    const worker = fs.readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
    expect(worker).toContain("skipWaiting");
    expect(worker).toContain("clients.claim");
    expect(worker).not.toMatch(/cache\.put|caches\.open|caches\.match/);
    expect(worker).not.toMatch(/addEventListener\(\s*["']fetch["']/);
    const config = fs.readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");
    expect(config).toContain('source: "/sw.js"');
    expect(config).toContain('value: "no-cache"');
    const register = fs.readFileSync(path.join(process.cwd(), "src/components/RegisterSW.tsx"), "utf8");
    expect(register).toContain('process.env.NODE_ENV !== "production"');
    expect(register).toContain("catch");
  });
});
