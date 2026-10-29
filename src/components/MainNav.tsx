"use client";

import { useEffect, useState } from "react";
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
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  return (
    <div className="mb-6">
      <button
        type="button"
        className="sm:hidden rounded-2xl border border-line bg-card px-4 text-base text-ink"
        data-testid="nav-menu"
        aria-expanded={open}
        aria-controls="main-nav"
        onClick={() => setOpen((value) => !value)}
      >
        Menu
      </button>
    <nav
      id="main-nav"
      aria-label="Main"
      className={`${open ? "mt-2 grid" : "hidden"} grid-cols-2 gap-1.5 sm:mt-0 sm:grid sm:grid-cols-3 ${showAccount ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}
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
    </div>
  );
}
