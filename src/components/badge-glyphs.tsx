/**
 * Original badge illustrations. Drawn for this app. No third-party artwork.
 */
import type { ReactNode } from "react";
import type { BadgeIconId } from "@/lib/game/badge-look";

const ink = "var(--badge-ink)";
const wash = "var(--badge-wash)";
const accent = "var(--badge-accent)";

export const BADGE_GLYPHS: Record<BadgeIconId, () => ReactNode> = {
  creation: Creation,
  ark: Ark,
  lion: Lion,
  dove: Dove,
  cross: Cross,
  scroll: Scroll,
  letter: Letter,
  wall: Wall,
  crown: Crown,
  shepherd: Shepherd,
  fish: Fish,
  bread: Bread,
  lamp: Lamp,
  staff: Staff,
  sling: Sling,
  star: Star,
  heart: Heart,
  flame: Flame,
  mountain: Mountain,
  tree: Tree,
  shield: Shield,
  wheat: Wheat,
  people: People,
  door: Door,
  road: Road,
  key: Key,
  trumpet: Trumpet,
  tablets: Tablets,
  ship: Ship,
  jar: Jar,
  tent: Tent,
  coat: Coat,
  cup: Cup,
  temple: Temple,
  bird: Bird,
  anchor: Anchor,
  sunrise: Sunrise,
  vine: Vine,
  rainbow: Rainbow,
  ladder: Ladder,
  storm: Storm,
  hands: Hands,
  well: Well,
  city: City,
  chain: Chain,
  scales: Scales,
  coin: Coin,
  ring: Ring,
  wheel: Wheel,
  hourglass: Hourglass,
  banner: Banner,
  tools: Tools,
  bones: Bones,
  drop: Drop,
  locust: Locust,
  horse: Horse,
  harp: Harp,
};

function Creation() {
  return (
    <>
      <ellipse cx="32" cy="50" rx="24" ry="8" fill={wash} />
      <path d="M8 46c8-14 14-16 24-6 8 8 16 6 24-8 2 10 2 16-4 20-10 4-18 2-26 6-8 2-14 0-18-12z" fill={ink} />
      <path d="M10 52c10-4 16-2 22 2s14 2 22-4" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="46" cy="16" r="7" fill={accent} />
      <path d="M46 4v4M46 24v4M34 16h4M54 16h4M37 8l2.4 2.4M52 22l2.4 2.4M37 24l2.4-2.4M52 10l2.4-2.4" stroke={accent} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Ark() {
  return (
    <>
      <path d="M10 18c8 4 14 4 22 0 6 4 12 4 20 0" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d="M14 24c6 3 12 3 18 0 5 3 10 3 16 0" fill="none" stroke={wash} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8 40h48l-6 12H14z" fill={ink} />
      <path d="M22 40V28h20v12" fill={wash} />
      <path d="M30 28h4v12" fill={ink} />
      <path d="M32 28v-5" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
    </>
  );
}

function Lion() {
  return (
    <>
      <circle cx="32" cy="34" r="18" fill={wash} />
      <path d="M16 28c-2-10 6-16 12-10M48 28c2-10-6-16-12-10M20 18c-6 2-8 8-4 12M44 18c6 2 8 8 4 12M18 40c-4 6-2 12 4 14M46 40c4 6 2 12-4 14" fill={accent} />
      <circle cx="32" cy="34" r="11" fill={accent} />
      <circle cx="28" cy="33" r="1.5" fill={ink} />
      <circle cx="36" cy="33" r="1.5" fill={ink} />
      <path d="M32 35v4M28 42c2 2 6 2 8 0" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
    </>
  );
}

function Dove() {
  return (
    <>
      <path d="M14 36c8-2 14-8 18-16 2 8 8 14 18 16-8 2-12 8-14 14-2-8-8-12-14-12-4 2-6 2-8-2z" fill={wash} />
      <path d="M18 34c10-6 16-6 26 2-8 4-12 10-12 16-2-8-8-12-14-18z" fill={ink} />
      <circle cx="44" cy="30" r="1.6" fill={ink} />
      <path d="M46 32c4 1 6 1 8-1" stroke={accent} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Cross() {
  return (
    <>
      <path d="M12 52c8-8 14-10 20-10s12 2 20 10" fill={wash} />
      <path d="M30 12h6v14h12v6H36v16h-6V32H16v-6h14z" fill={ink} />
      <circle cx="48" cy="16" r="4" fill={accent} />
    </>
  );
}

function Scroll() {
  return (
    <>
      <path d="M16 16h28c6 0 10 4 10 10v22H22c-6 0-10-3-10-8V16z" fill={wash} />
      <path d="M16 16c0 6 4 8 8 8h30" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M22 48c0 4 4 6 8 6h24" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M26 32h16M26 38h12" stroke={accent} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Letter() {
  return (
    <>
      <path d="M10 18h44v28H10z" fill={wash} />
      <path d="m10 18 22 16L54 18" fill={accent} />
      <path d="M10 46 26 32M54 46 38 32" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

function Wall() {
  return (
    <>
      <path d="M8 28h10V16h8v12h12V16h8v12h10v28H8z" fill={wash} />
      <path d="M8 36h48M8 46h48M18 28v8M30 36v10M42 28v8M24 46v10M40 46v10" stroke={ink} strokeWidth="2" />
      <path d="M14 16h6M34 16h6" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Crown() {
  return (
    <>
      <path d="M10 40 16 22l10 10 6-16 6 16 10-10 6 18z" fill={accent} />
      <path d="M12 40h40v8H12z" fill={ink} />
      <circle cx="22" cy="36" r="2" fill={wash} />
      <circle cx="32" cy="34" r="2" fill={wash} />
      <circle cx="42" cy="36" r="2" fill={wash} />
    </>
  );
}

function Shepherd() {
  return (
    <>
      <ellipse cx="28" cy="40" rx="14" ry="10" fill={wash} />
      <circle cx="40" cy="34" r="7" fill={accent} />
      <circle cx="42" cy="33" r="1.3" fill={ink} />
      <path d="M16 26c2 16 6 22 10 22" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M16 26c8-2 10 2 8 8" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Fish() {
  return (
    <>
      <path d="M8 32c10-12 24-14 40-6 4 2 8 2 10 0-2 8-8 12-12 14C32 46 16 42 8 32z" fill={wash} />
      <path d="M10 32 4 24v16z" fill={ink} />
      <path d="M30 26c6 4 10 4 16 0" stroke={accent} strokeWidth="2" strokeLinecap="round" />
      <circle cx="42" cy="30" r="1.8" fill={ink} />
    </>
  );
}

function Bread() {
  return (
    <>
      <path d="M12 36c0-12 8-18 20-18s20 6 20 18c2 8 0 16-6 20H18c-6-4-8-12-6-20z" fill={wash} />
      <path d="M16 38c2 10 8 16 16 16s14-6 16-16c-4 4-10 6-16 6s-12-2-16-6z" fill={accent} />
      <path d="M24 32c4 3 6 3 10 0M32 30c4 4 8 4 12 0" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
    </>
  );
}

function Lamp() {
  return (
    <>
      <path d="M22 18c8-10 16-8 18 2 4 8-2 14-8 16H30C22 34 16 28 18 20z" fill={wash} />
      <path d="M30 36h10l2 6H28z" fill={ink} />
      <path d="M24 42h20" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M34 16c2 6-2 10-2 14" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="40" cy="14" r="3" fill={accent} />
    </>
  );
}

function Staff() {
  return (
    <>
      <path d="M24 20c0-10 16-12 18 0 1 8-6 10-10 8" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
      <path d="M32 26v26" stroke={ink} strokeWidth="5" strokeLinecap="round" />
      <circle cx="20" cy="18" r="4.5" fill={accent} />
      <path d="M40 40c8 1 12-2 14-8" stroke={wash} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Sling() {
  return (
    <>
      <path d="M14 12c12 10 16 20 12 34" fill="none" stroke={ink} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M26 46c8 2 14-2 18-8" fill="none" stroke={ink} strokeWidth="3.6" strokeLinecap="round" />
      <ellipse cx="44" cy="28" rx="10" ry="7" fill={wash} />
      <circle cx="44" cy="28" r="5.5" fill={accent} />
    </>
  );
}

function Star() {
  return (
    <>
      <circle cx="32" cy="32" r="16" fill={wash} />
      <path d="M32 10 36.5 24H51l-12 8.5 4.5 13.5L32 37.5 20.5 46 25 32.5 13 24h14.5z" fill={accent} />
    </>
  );
}

function Heart() {
  return (
    <>
      <path d="M32 52 14 34c-7-8 2-20 11-15 4 2 6 6 7 8 1-2 3-6 7-8 9-5 18 7 11 15z" fill={accent} />
      <path d="M24 28c2-4 6-6 8-4" stroke={wash} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Flame() {
  return (
    <>
      <path d="M32 8c8 10 4 16 10 24 6 8-2 20-10 20s-16-10-12-20c4-2 4-8 2-14 4 6 6 6 10-10z" fill={accent} />
      <path d="M32 28c4 4 4 10 0 16-4-2-6-8-4-12 2 2 3 2 4-4z" fill={wash} />
    </>
  );
}

function Mountain() {
  return (
    <>
      <path d="M6 52 24 18l12 18 8-10 16 26z" fill={wash} />
      <path d="M24 18l6 10-8 4z" fill={accent} />
      <path d="M6 52h54" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Tree() {
  return (
    <>
      <path d="M32 54V34" stroke={ink} strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="26" r="14" fill={wash} />
      <circle cx="24" cy="28" r="4" fill={accent} />
      <circle cx="38" cy="22" r="3.5" fill={accent} />
      <circle cx="36" cy="32" r="3" fill={ink} />
    </>
  );
}

function Shield() {
  return (
    <>
      <path d="M32 8 52 16v14c0 14-8 22-20 26C20 52 12 44 12 30V16z" fill={wash} />
      <path d="M32 16v28M22 28h20" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="28" r="3" fill={accent} />
    </>
  );
}

function Wheat() {
  return (
    <>
      <path d="M32 56V18" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M32 22c-8 2-12 8-8 14 6-2 10-6 8-14zM32 30c8 2 12 8 8 14-6-2-10-6-8-14zM32 40c-8 2-10 8-6 12 6-2 8-6 6-12z" fill={accent} />
      <path d="M32 14c4-4 8-4 10-2" stroke={wash} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function People() {
  return (
    <>
      <circle cx="20" cy="18" r="5" fill={accent} />
      <circle cx="44" cy="18" r="5" fill={accent} />
      <circle cx="32" cy="22" r="5" fill={wash} />
      <path d="M10 50c2-10 6-14 10-14s8 4 10 14M34 50c2-10 6-14 10-14s8 4 10 14" fill={ink} />
      <path d="M22 50c2-8 5-12 10-12s8 4 10 12" fill={wash} />
    </>
  );
}

function Door() {
  return (
    <>
      <path d="M16 54V22c0-8 6-14 16-14s16 6 16 14v32z" fill={wash} />
      <path d="M24 54V28c0-5 4-8 8-8s8 3 8 8v26" fill={accent} />
      <circle cx="38" cy="40" r="1.8" fill={ink} />
    </>
  );
}

function Road() {
  return (
    <>
      <path d="M16 56 26 12h12L48 56z" fill={wash} />
      <path d="M30 18v8M30 32v8M30 46v6" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d="M18 56h28" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Key() {
  return (
    <>
      <circle cx="24" cy="26" r="10" fill={wash} />
      <circle cx="24" cy="26" r="4" fill={accent} />
      <path d="M32 30h18v6H42v6h-6v-6" fill={ink} />
    </>
  );
}

function Trumpet() {
  return (
    <>
      <path d="M10 34h24l16-10v24L34 38H10z" fill={wash} />
      <path d="M18 38c0 8 6 12 10 12" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M46 24c4 4 4 16 0 20" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Tablets() {
  return (
    <>
      <path d="M12 12h18v40H12z" fill={wash} />
      <path d="M34 12h18v40H34z" fill={accent} />
      <path d="M16 22h10M16 30h10M16 38h8M38 22h10M38 30h10M38 38h8" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Ship() {
  return (
    <>
      <path d="M8 40h48l-8 12H16z" fill={ink} />
      <path d="M32 40V16" stroke={ink} strokeWidth="3" />
      <path d="M32 18h16l-16 12z" fill={wash} />
      <path d="M32 22H18l14 10z" fill={accent} />
      <path d="M10 56c6-3 10-3 16 0s10 3 16 0 10-3 14 0" stroke={wash} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Jar() {
  return (
    <>
      <path d="M24 14h16v6H24z" fill={ink} />
      <path d="M22 20h20c2 8 6 14 6 22 0 8-6 12-16 12S16 50 16 42c0-8 4-14 6-22z" fill={wash} />
      <path d="M20 34h24" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Tent() {
  return (
    <>
      <path d="M8 50 32 14l24 36z" fill={wash} />
      <path d="M32 14 40 50H24z" fill={accent} />
      <path d="M8 50h48" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Coat() {
  return (
    <>
      <path d="M22 16 32 26 42 16l10 8-6 30H18L12 24z" fill={wash} />
      <path d="M26 24h12l-2 26h-8z" fill={accent} />
      <path d="M22 34h20" stroke={ink} strokeWidth="2" />
    </>
  );
}

function Cup() {
  return (
    <>
      <path d="M18 16h28v8c0 12-6 20-14 20S18 36 18 24z" fill={wash} />
      <path d="M22 16h20v6c0 8-4 14-10 14s-10-6-10-14z" fill={accent} />
      <path d="M32 44v6M24 54h16" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Temple() {
  return (
    <>
      <path d="M8 24 32 10l24 14v4H8z" fill={accent} />
      <path d="M14 28h6v22h-6zM29 28h6v22h-6zM44 28h6v22h-6z" fill={wash} />
      <path d="M10 50h44v6H10z" fill={ink} />
    </>
  );
}

function Bird() {
  return (
    <>
      <path d="M14 36c8-14 20-16 34-8-8 2-12 8-12 14 6 0 12-2 16-6-2 10-12 16-22 16-8 0-14-4-16-16z" fill={wash} />
      <circle cx="40" cy="28" r="1.7" fill={ink} />
      <path d="M44 30h8" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M28 48v6M36 48v6" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

function Anchor() {
  return (
    <>
      <circle cx="32" cy="14" r="5" fill={accent} />
      <path d="M32 19v28" stroke={ink} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M20 28h24" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M18 40c2 10 8 14 14 14s12-4 14-14" fill="none" stroke={wash} strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

function Sunrise() {
  return (
    <>
      <path d="M8 40h48v14H8z" fill={wash} />
      <path d="M14 40a18 18 0 0 1 36 0" fill={accent} />
      <path d="M32 14v6M16 20l4 4M48 20l-4 4M12 34h6M46 34h6" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8 48h48" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Vine() {
  return (
    <>
      <path d="M20 54c4-12 8-16 12-28 4 8 8 12 16 10" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="28" r="6" fill={wash} />
      <circle cx="40" cy="22" r="6" fill={wash} />
      <circle cx="36" cy="36" r="5" fill={accent} />
      <circle cx="46" cy="32" r="4" fill={accent} />
    </>
  );
}

function Rainbow() {
  return (
    <>
      <path d="M8 44a24 24 0 0 1 48 0" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      <path d="M14 44a18 18 0 0 1 36 0" fill="none" stroke={wash} strokeWidth="4" strokeLinecap="round" />
      <path d="M20 44a12 12 0 0 1 24 0" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />
      <path d="M10 50h12M42 50h12" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Ladder() {
  return (
    <>
      <path d="M20 8v48M44 8v48" stroke={ink} strokeWidth="4" strokeLinecap="round" />
      <path d="M20 18h24M20 30h24M20 42h24" stroke={accent} strokeWidth="3.2" strokeLinecap="round" />
    </>
  );
}

function Storm() {
  return (
    <>
      <path d="M16 36c0-8 6-14 14-14 2-6 10-8 16-4 6 2 8 8 6 14H16z" fill={wash} />
      <path d="M30 36 24 50h8l-4 10 14-16h-8l6-8z" fill={accent} />
    </>
  );
}

function Hands() {
  return (
    <>
      <path d="M18 34c0-8 6-12 12-12 2-6 8-8 12-4 6 2 8 10 6 16v14H18z" fill={wash} />
      <path d="M24 30V20M32 28V16M40 30V22" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M18 46h28" stroke={accent} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Well() {
  return (
    <>
      <path d="M14 24h36v6H14z" fill={ink} />
      <path d="M18 30h28l-4 8H22z" fill={wash} />
      <ellipse cx="32" cy="42" rx="14" ry="6" fill={accent} />
      <path d="M32 18v6" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M22 14h20" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function City() {
  return (
    <>
      <path d="M8 54V28h14v26H8z" fill={wash} />
      <path d="M22 54V16h16v38H22z" fill={accent} />
      <path d="M38 54V34h16v20H38z" fill={wash} />
      <path d="M26 24h3M33 24h3M26 32h3M33 32h3M12 34h3M12 42h3M44 40h3M44 46h3" fill={ink} />
    </>
  );
}

function Chain() {
  return (
    <>
      <rect x="10" y="26" width="16" height="12" rx="6" fill="none" stroke={ink} strokeWidth="4" />
      <rect x="24" y="26" width="16" height="12" rx="6" fill="none" stroke={accent} strokeWidth="4" />
      <rect x="38" y="26" width="16" height="12" rx="6" fill="none" stroke={wash} strokeWidth="4" />
    </>
  );
}

function Scales() {
  return (
    <>
      <path d="M32 12v36" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M14 20h36" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M14 20 8 34h12z" fill={wash} />
      <path d="M50 20 44 34h12z" fill={accent} />
      <path d="M22 50h20" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Coin() {
  return (
    <>
      <circle cx="32" cy="32" r="16" fill={accent} />
      <circle cx="32" cy="32" r="10" fill="none" stroke={ink} strokeWidth="2.4" />
      <path d="M32 24v16M28 28c2-2 6-2 8 0M28 36c2 2 6 2 8 0" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Ring() {
  return (
    <>
      <circle cx="32" cy="36" r="12" fill="none" stroke={ink} strokeWidth="5" />
      <path d="M32 24 36 12h-8z" fill={accent} />
      <circle cx="32" cy="16" r="4" fill={wash} />
    </>
  );
}

function Wheel() {
  return (
    <>
      <circle cx="32" cy="32" r="16" fill={wash} />
      <circle cx="32" cy="32" r="16" fill="none" stroke={ink} strokeWidth="4" />
      <circle cx="32" cy="32" r="4" fill={accent} />
      <path d="M32 16v10M32 38v10M16 32h10M38 32h10" stroke={ink} strokeWidth="2.4" />
    </>
  );
}

function Hourglass() {
  return (
    <>
      <path d="M20 10h24v6L32 32 44 48v6H20v-6l12-16L20 16z" fill={wash} />
      <path d="M24 46h16l-8-10z" fill={accent} />
      <path d="M18 10h28M18 54h28" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Banner() {
  return (
    <>
      <path d="M18 8v48" stroke={ink} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M18 12h28l-6 10 6 10H18z" fill={accent} />
      <path d="M24 20h12" stroke={wash} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Tools() {
  return (
    <>
      <path d="M14 40 36 18l6 6L20 46z" fill={wash} />
      <path d="M36 14c6-4 14 2 10 8l-6 2-6-6z" fill={accent} />
      <path d="M40 36l10 10" stroke={ink} strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

function Bones() {
  return (
    <>
      <path d="M22 22c0-6 8-8 12-2l8 8c6-4 12 2 8 8-6 4-8 10-2 14l-8-8c-4 6-12 6-14 0l-8 8c-6-4-4-12 2-14 4-6 2-12 2-14z" fill={wash} />
      <path d="M30 30l10 10" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Drop() {
  return (
    <>
      <path d="M32 8c12 16 16 24 16 32a16 16 0 0 1-32 0c0-8 4-16 16-32z" fill={wash} />
      <path d="M26 40c2 6 10 8 14 2" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

function Locust() {
  return (
    <>
      <ellipse cx="32" cy="36" rx="10" ry="14" fill={wash} />
      <circle cx="32" cy="18" r="6" fill={accent} />
      <path d="M22 16c-8-6-12-4-12 2M42 16c8-6 12-4 12 2" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M24 32 12 28M24 40 12 44M40 32l12-4M40 40l12 4" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Harp() {
  return (
    <>
      <path d="M16 48c2-24 12-34 28-34 8 0 14 6 14 14v20" fill="none" stroke={ink} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M18 48h40" stroke={ink} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M24 46V30M30 46V26M36 46V24M42 46V28" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="44" cy="22" r="3" fill={wash} />
    </>
  );
}

function Horse() {
  return (
    <>
      <path d="M18 40c2-14 10-20 18-16 2-8 10-10 14-4l-4 8 6 4v10H40l-4 12h-8l2-12H18z" fill={wash} />
      <path d="M36 22c4-6 10-6 12-2" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="42" cy="28" r="1.4" fill={ink} />
      <path d="M22 54h8M40 54h8" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}
