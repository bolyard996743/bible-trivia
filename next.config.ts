import type { NextConfig } from "next";
import { validateDevotions } from "./src/lib/content/devotions";
import { validateContentTree } from "./src/lib/content/validate";

const content = validateContentTree(process.cwd());
const devotions = validateDevotions(process.cwd());
const errors = [...content.errors, ...devotions.errors];
if (!content.ok || !devotions.ok) {
  throw new Error(`Content validation failed:\n${errors.join("\n")}`);
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
  // /play awaits searchParams, so loadCatalog() reads content/ inside the
  // serverless function. Home is dynamic for the daily devotion too.
  outputFileTracingIncludes: {
    "/*": ["./content/**/*"],
  },
};

export default nextConfig;
