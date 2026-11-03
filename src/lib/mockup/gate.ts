/**
 * Mockup routes render in local development, on Vercel preview, and when
 * MOCKUPS_ENABLED=1. Production stays a 404 unless that flag is set.
 */
export function mockupsEnabled(): boolean {
  if (process.env.MOCKUPS_ENABLED === "1") return true;
  if (process.env.NODE_ENV !== "production") return true;
  const env = process.env.VERCEL_ENV;
  return env === "preview" || env === "development";
}
