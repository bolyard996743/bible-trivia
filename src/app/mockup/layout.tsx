import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MockupShell } from "@/components/mockup/MockupShell";
import { mockupsEnabled } from "@/lib/mockup/gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mockup · Noble Bereans",
  robots: { index: false, follow: false },
};

export default function MockupLayout({ children }: { children: React.ReactNode }) {
  if (!mockupsEnabled()) notFound();
  return (
    <Suspense fallback={<p className="px-4 py-6 text-lg text-ink-soft">Opening example…</p>}>
      <MockupShell>{children}</MockupShell>
    </Suspense>
  );
}
