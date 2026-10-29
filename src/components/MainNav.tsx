"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canOfferAccount } from "@/lib/account/policy";
import { useAgeGate } from "@/lib/account/use-access";
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
  const gate = useAgeGate();
  const showAccount = gate.value ? !gate.value.under13 : canOfferAccount(state?.ageGroup);
  const links = showAccount
    ? [...LINKS, { href: "/account", label: "Account" }]
    : LINKS;
  return (
    <nav
      aria-label="Main"
      className={`mb-6 grid grid-cols-2 gap-1.5 sm:grid-cols-3 ${showAccount ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}
    >
      {links.map((link) => {
        const current = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={`tap inline-flex min-w-0 items-center justify-center rounded-2xl border px-1.5 text-center text-sm whitespace-nowrap ${
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
