import type { NextConfig } from "next";
import { validateContentTree } from "./src/lib/content/validate";

const content = validateContentTree(process.cwd());
if (!content.ok) {
  throw new Error(`Content validation failed:\n${content.errors.join("\n")}`);
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  // /play awaits searchParams, so loadCatalog() reads content/ inside the
  // serverless function. Other catalog pages are prerendered at build time.
  outputFileTracingIncludes: {
    "/*": ["./content/**/*"],
  },
};

export default nextConfig;
