import { afterEach, describe, expect, it, vi } from "vitest";
import { PRODUCTION_ORIGIN, authCallbackUrl, siteOrigin } from "@/lib/site-url";

describe("site origin", () => {
  const previous = process.env.VERCEL_URL;

  afterEach(() => {
    if (previous === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = previous;
    vi.unstubAllGlobals();
  });

  it("uses the browser origin for auth redirects", () => {
    vi.stubGlobal("window", { location: { origin: "http://127.0.0.1:3000" } });
    process.env.VERCEL_URL = "noble-bereans.vercel.app";
    expect(authCallbackUrl()).toBe("http://127.0.0.1:3000/auth/callback");
  });

  it("uses VERCEL_URL when there is no browser", () => {
    process.env.VERCEL_URL = "https://noble-bereans-git-example.vercel.app";
    expect(siteOrigin()).toBe("https://noble-bereans-git-example.vercel.app");
    expect(authCallbackUrl()).toBe("https://noble-bereans-git-example.vercel.app/auth/callback");
  });

  it("falls back to the renamed production host", () => {
    delete process.env.VERCEL_URL;
    expect(siteOrigin()).toBe(PRODUCTION_ORIGIN);
    expect(PRODUCTION_ORIGIN).toBe("https://noble-bereans.vercel.app");
  });
});
