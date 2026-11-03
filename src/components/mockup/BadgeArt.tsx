import type { BadgeArt as BadgeArtId } from "@/lib/mockup/preview";

/** Static picture for an earned section. No letters. */
export function BadgeArt({ art }: { art: BadgeArtId }) {
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
      {picture(art)}
    </svg>
  );
}

function picture(art: BadgeArtId) {
  switch (art) {
    case "sun":
      return (
        <>
          <circle cx="24" cy="24" r="8" fill="#e0a020" />
          <g stroke="#e0a020" strokeWidth="2.5" strokeLinecap="round">
            <path d="M24 8v5M24 35v5M8 24h5M35 24h5M12 12l3.5 3.5M32.5 32.5L36 36M36 12l-3.5 3.5M15.5 32.5L12 36" />
          </g>
        </>
      );
    case "rainbow":
      return (
        <g fill="none" strokeWidth="3" strokeLinecap="round">
          <path d="M8 32a16 16 0 0 1 32 0" stroke="#c4473a" />
          <path d="M12 32a12 12 0 0 1 24 0" stroke="#e0a020" />
          <path d="M16 32a8 8 0 0 1 16 0" stroke="#2f6b3a" />
        </g>
      );
    case "bush":
      return (
        <>
          <path d="M16 40c2-8 4-12 8-16 4 4 6 8 8 16" fill="#2f6b3a" />
          <circle cx="18" cy="28" r="6" fill="#3d7d48" />
          <circle cx="28" cy="26" r="7" fill="#2f6b3a" />
          <path d="M24 22c1-4 3-6 4-9 2 3 2 6 1 9" fill="#e07a2a" />
        </>
      );
    case "stone":
      return <ellipse cx="24" cy="26" rx="12" ry="9" fill="#8d8680" />;
    case "fish":
      return (
        <>
          <path d="M7 24l11-10v6c6-3 14-3 18 0 4 3 4 7 0 10-4 3-12 3-18 0v6z" fill="#1d6a78" />
          <circle cx="30" cy="22" r="1.8" fill="#fff8ee" />
          <circle cx="30.5" cy="22" r="0.8" fill="#08343c" />
        </>
      );
    case "star":
      return <path d="M24 8l3.8 9.2H38l-8 6.2 3 9.6L24 28.8 15 33l3-9.6-8-6.2h10.2z" fill="#e0a020" />;
    case "waves":
      return (
        <g fill="none" stroke="#3d6d94" strokeWidth="3" strokeLinecap="round">
          <path d="M8 20c4 4 8 4 12 0s8-4 12 0 8 4 8 4" />
          <path d="M8 30c4 4 8 4 12 0s8-4 12 0 8 4 8 4" />
        </g>
      );
    case "cross":
      return (
        <>
          <rect x="20" y="8" width="8" height="32" rx="2" fill="#6b4423" />
          <rect x="10" y="16" width="28" height="8" rx="2" fill="#6b4423" />
        </>
      );
    case "heart":
      return <path d="M24 40s-14-8.5-14-18a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 9.5-14 18-14 18z" fill="#a33b45" />;
    case "people":
      return (
        <g fill="#3d5a4a">
          <circle cx="14" cy="16" r="4" />
          <circle cx="24" cy="14" r="4.5" />
          <circle cx="34" cy="16" r="4" />
          <path d="M8 34c1-6 4-8 6-8s5 2 6 8M18 34c1-7 4-10 6-10s5 3 6 10M28 34c1-6 4-8 6-8s5 2 6 8" />
        </g>
      );
    case "book":
      return (
        <>
          <path d="M10 12h13v26H12a4 4 0 0 1-4-4z" fill="#6b4423" />
          <path d="M25 12h13v22a4 4 0 0 1-4 4H25z" fill="#8a5a32" />
        </>
      );
    case "lamb":
      return (
        <>
          <ellipse cx="24" cy="28" rx="12" ry="8" fill="#f4f0ea" stroke="#b7aa9c" strokeWidth="1.5" />
          <circle cx="34" cy="22" r="5" fill="#f4f0ea" stroke="#b7aa9c" strokeWidth="1.5" />
          <circle cx="36" cy="21" r="1" fill="#3a322c" />
          <path d="M16 34v6M24 35v5M32 34v6" stroke="#c9bfb4" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "tablets":
      return (
        <g fill="#d9e4ea" stroke="#5c6d78" strokeWidth="1.5">
          <rect x="10" y="8" width="13" height="30" rx="2" />
          <rect x="25" y="8" width="13" height="30" rx="2" />
        </g>
      );
    case "sheep":
      return (
        <>
          <circle cx="18" cy="22" r="6" fill="#f7f4ef" stroke="#b7aa9c" strokeWidth="1.5" />
          <circle cx="26" cy="20" r="7" fill="#f7f4ef" stroke="#b7aa9c" strokeWidth="1.5" />
          <circle cx="32" cy="24" r="5" fill="#f7f4ef" stroke="#b7aa9c" strokeWidth="1.5" />
          <ellipse cx="26" cy="32" rx="10" ry="6" fill="#f7f4ef" stroke="#b7aa9c" strokeWidth="1.5" />
          <path d="M18 36v5M26 37v4M33 36v5" stroke="#c9bfb4" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "scroll":
      return (
        <>
          <rect x="14" y="12" width="22" height="24" rx="2" fill="#f3e6c4" />
          <path d="M14 12c0-3 2-5 5-5h18c0 3-2 5-5 5" fill="#e2d0a4" />
          <path d="M14 36c0 3 2 5 5 5h18c0-3-2-5-5-5" fill="#e2d0a4" />
        </>
      );
    case "path":
      return (
        <>
          <path d="M8 36h32" stroke="#8a9a78" strokeWidth="3" strokeLinecap="round" />
          <path d="M30 36c-2-8-6-10-8-16s-2-10 2-14" fill="none" stroke="#c4841a" strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "lamp":
      return (
        <>
          <path d="M16 28h16l-2 8H18z" fill="#c4841a" />
          <path d="M20 28c0-6 2-10 4-14 2 4 4 8 4 14" fill="#e7c56a" />
          <rect x="22" y="36" width="4" height="6" fill="#6b4423" />
        </>
      );
    case "road":
      return (
        <>
          <path d="M10 40 L20 8h8L38 40z" fill="#c9bfb0" />
          <path d="M24 14v6M24 24v6M24 34v4" stroke="#fff8ee" strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "pages":
      return (
        <>
          <rect x="10" y="12" width="20" height="26" rx="2" fill="#efe6d4" />
          <rect x="18" y="8" width="20" height="26" rx="2" fill="#f7f1e4" stroke="#c4b496" strokeWidth="1.5" />
        </>
      );
  }
}
