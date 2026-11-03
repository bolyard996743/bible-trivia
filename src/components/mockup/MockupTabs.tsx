"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOCKUP_TABS, visibleTabs } from "@/lib/mockup/preview";
import { usePreview } from "./preview-context";

export function MockupTabs() {
  const pathname = usePathname();
  const { preview, href } = usePreview();
  const allowed = visibleTabs(preview.player);
  const tabs = MOCKUP_TABS.filter((tab) => allowed.includes(tab.id));

  return (
    <nav
      aria-label="Mockup"
      data-testid="mockup-tabs"
      className="fixed inset-x-0 bottom-0 z-20 flex justify-center"
    >
      <div
        className="grid w-full max-w-[430px] border-t border-line bg-card pb-[max(0.25rem,env(safe-area-inset-bottom))]"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const current = pathname === tab.href;
          return (
            <Link
              key={tab.id}
              href={href(tab.href)}
              aria-current={current ? "page" : undefined}
              data-testid={`mockup-tab-${tab.id}`}
              className={`tap inline-flex min-w-0 items-center justify-center px-1 text-center text-sm ${
                current ? "bg-grove font-semibold text-white" : "text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
