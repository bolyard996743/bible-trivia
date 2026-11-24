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
};

export default nextConfig;
