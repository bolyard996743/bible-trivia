import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import manifest from "../src/app/manifest";

const root = process.cwd();

describe("Noble Bereans", () => {
  it("uses the game name in user-facing copy and keeps the package name", () => {
    const files = [
      "README.md",
      "src/app/manifest.ts",
      "src/app/layout.tsx",
      "src/app/page.tsx",
      "src/components/SiteLogo.tsx",
    ];
    for (const file of files) {
      const text = fs.readFileSync(path.join(root, file), "utf8");
      expect(text, file).toContain("Noble Bereans");
      expect(text, file).not.toMatch(/Lamp & Path/);
      expect(text, file).not.toMatch(/Bible Trivia/);
    }
    const webManifest = manifest();
    expect(webManifest.name).toBe("Noble Bereans");
    expect(webManifest.short_name).toBe("Noble Bereans");
    expect(webManifest.display).toBe("standalone");
    expect(webManifest.start_url).toBe("/");
    expect(webManifest.scope).toBe("/");
    expect(webManifest.theme_color).toBe("#1a7a42");
    expect(webManifest.background_color).toBe("#f8e6c6");
    const manifestIcons = webManifest.icons ?? [];
    expect(manifestIcons.some((icon) => icon.purpose === "any" && icon.src.endsWith("icon-512.png"))).toBe(true);
    expect(manifestIcons.some((icon) => icon.purpose === "maskable")).toBe(true);
    for (const file of [
      "public/brand/logo-full-source.jpg",
      "public/brand/icon-source.jpg",
      "public/brand/logo-ink-mask.png",
      "public/brand/logo-accent-mask.png",
      "public/favicon.ico",
      "public/apple-touch-icon.png",
      "public/icons/icon-192.png",
      "public/icons/icon-512.png",
      "public/icons/icon-maskable-512.png",
    ]) {
      expect(fs.existsSync(path.join(root, file)), file).toBe(true);
    }
    const shell = fs.readFileSync(path.join(root, "src/components/Shell.tsx"), "utf8");
    expect(shell).toContain("SiteLogo");
    expect(shell).not.toContain(">Noble Bereans<");
    const page = fs.readFileSync(path.join(root, "src/app/page.tsx"), "utf8");
    expect(page).toContain("(NO-bul buh-REE-unz)");
    expect(page).toContain("The Bereans checked the Scriptures every day to see what was true. (See Acts 17:11)");
    expect(page).not.toContain("New King James Version");
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as { name: string };
    expect(pkg.name).toBe("bible-trivia");
    const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
    expect(readme).toContain("https://noble-bereans.vercel.app");
    expect(readme).toContain("noble-bereans-git-");
    expect(readme).toContain("https://github.com/bolyard996743/lamp-and-path");
    expect(readme).not.toContain("lamp-and-path.vercel.app");
    expect(readme).not.toContain("bible-trivia.vercel.app");
    expect(readme).not.toContain("github.com/bolyard996743/bible-trivia");
  });
});
