import Link from "next/link";
import { FOOTER_LINKS } from "@/lib/legal";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-line pt-4" data-testid="site-footer">
      <nav aria-label="Legal" className="flex flex-wrap gap-3">
        {FOOTER_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="tap inline-flex items-center text-lg text-grove-deep underline"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
