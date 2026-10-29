import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Lamp & Path", () => {
  it("uses the game name in user-facing copy and keeps the package name", () => {
    const files = [
      "README.md",
      "public/manifest.webmanifest",
      "src/app/layout.tsx",
      "src/app/page.tsx",
      "src/components/Shell.tsx",
    ];
    for (const file of files) {
      const text = fs.readFileSync(path.join(root, file), "utf8");
      expect(text, file).toMatch(/Lamp &(?:amp;)? Path/);
      expect(text, file).not.toMatch(/Bible Trivia/);
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "public/manifest.webmanifest"), "utf8")) as {
      name: string;
      short_name: string;
    };
    expect(manifest.name).toBe("Lamp & Path");
    expect(manifest.short_name).toBe("Lamp & Path");
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as { name: string };
    expect(pkg.name).toBe("bible-trivia");
    const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
    expect(readme).toContain("https://lamp-and-path.vercel.app");
    expect(readme).toContain("https://github.com/bolyard996743/lamp-and-path");
    expect(readme).not.toContain("bible-trivia.vercel.app");
    expect(readme).not.toContain("github.com/bolyard996743/bible-trivia");
  });
});
