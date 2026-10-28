"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canOfferAccount } from "@/lib/account/policy";
import { useProfile } from "@/lib/use-profile";

const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/bible", label: "Bible" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/settings", label: "Settings" },
] as const;

export function MainNav() {
  const pathname = usePathname();
  const { state } = useProfile();
  const links = canOfferAccount(state?.ageGroup)
    ? [...LINKS, { href: "/account", label: "Account" }]
    : LINKS;
  return (
    <nav aria-label="Main" className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {links.map((link) => {
        const current = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={`tap inline-flex items-center justify-center rounded-2xl border px-3 text-center text-base ${
              current ? "border-grove bg-grove font-semibold text-white" : "border-line bg-card text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
