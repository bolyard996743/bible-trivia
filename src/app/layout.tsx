import type { Metadata, Viewport } from "next";
import { AccountSync } from "@/components/AccountSync";
import { RegisterSW } from "@/components/RegisterSW";
import { Shell } from "@/components/Shell";
import { siteOrigin } from "@/lib/site-url";
import { THEME_BOOT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: "Noble Bereans",
  description: "Noble Bereans teaches from Scripture and waits until you know the answer.",
  applicationName: "Noble Bereans",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Noble Bereans",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2f5d45",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <RegisterSW />
        <AccountSync />
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
