// Plain elements so the countdown test can render this file without a JSX transform.
import { createElement } from "react";
import { BADGE_RETRY_CAPTION, BADGE_RETRY_CARE, BADGE_RETRY_WAIT, formatBadgeCountdown } from "@/lib/game/badge-retry";

export function BadgeRetryNotice({ now, retryAt }: { now: number; retryAt: string }) {
  const remaining = Math.max(0, Date.parse(retryAt) - now);
  return createElement(
    "div",
    { "data-testid": "badge-retry", className: "grid gap-3" },
    createElement("p", { className: "text-lg text-ink" }, BADGE_RETRY_WAIT),
    createElement("p", { className: "text-lg text-ink" }, BADGE_RETRY_CARE),
    createElement(
      "p",
      { className: "text-lg text-ink" },
      `${BADGE_RETRY_CAPTION} `,
      createElement(
        "span",
        {
          "data-testid": "badge-retry-countdown",
          role: "timer",
          "aria-live": "off",
          suppressHydrationWarning: true,
          className: "text-3xl font-semibold tabular-nums text-grove-deep",
        },
        formatBadgeCountdown(remaining),
      ),
    ),
  );
}
