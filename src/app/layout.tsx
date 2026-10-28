import type { Metadata, Viewport } from "next";
import { AccountSync } from "@/components/AccountSync";
import { RegisterSW } from "@/components/RegisterSW";
import { Shell } from "@/components/Shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bible Trivia",
  description: "A wholesome Bible trivia game that teaches from Scripture and waits until you know the answer.",
  applicationName: "Bible Trivia",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Bible Trivia",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2f5d45",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <RegisterSW />
        <AccountSync />
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
