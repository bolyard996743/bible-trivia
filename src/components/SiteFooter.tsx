import Link from "next/link";
import { FOOTER_LINKS } from "@/lib/legal";

export const BOLYARD_GARAGE_URL = "https://www.soundon.global/bio/bolyardgarage";

/**
 * Full name is "Bolyard Garage". The visible word stays short so Privacy,
 * Terms, and Donate remain on one row at 320px. The accessible name keeps
 * the full title.
 */
export const BOLYARD_GARAGE_LABEL = "Music";

function MusicNoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V6l10-2v12" />
      <circle cx="7" cy="18" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="16" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card pb-[max(0.35rem,env(safe-area-inset-bottom))]"
      data-testid="site-footer"
    >
      <nav
        aria-label="Footer"
        className="mx-auto flex w-full max-w-3xl flex-nowrap items-center gap-2 px-2 [&>a]:shrink-0"
      >
        {FOOTER_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="tap inline-flex items-center text-lg text-grove-deep underline"
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/donate"
          data-testid="footer-donate"
          className="tap inline-flex min-w-11 items-center px-1 text-lg text-grove-deep underline"
        >
          Donate
        </Link>
        <a
          href={BOLYARD_GARAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Bolyard Garage (opens in a new tab)"
          data-testid="footer-bolyard-garage"
          className="tap inline-flex min-w-11 shrink-0 items-center justify-center gap-1 px-1 text-lg text-grove-deep underline"
        >
          <MusicNoteIcon />
          {BOLYARD_GARAGE_LABEL}
        </a>
      </nav>
    </footer>
  );
}
