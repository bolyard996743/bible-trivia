import type { MascotId } from "./game/types";

export const THEME_IDS = ["default", "hunter", "agnes", "judah", "zion", "shalom"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeColors = {
  parchment: string;
  card: string;
  ink: string;
  inkSoft: string;
  grove: string;
  groveDeep: string;
  gold: string;
  goldSoft: string;
  line: string;
  calm: string;
  buttonText: string;
  logoInk: string;
  logoAccent: string;
};

export const THEMES: Record<ThemeId, ThemeColors> = {
  default: {
    parchment: "#f8e6c6",
    card: "#fff7ea",
    ink: "#2a1c12",
    inkSoft: "#5c4532",
    grove: "#1a7a42",
    groveDeep: "#145c32",
    gold: "#7a4e0c",
    goldSoft: "#f6d48a",
    line: "#e6c99a",
    calm: "#3a5d78",
    buttonText: "#ffffff",
    logoInk: "#145c32",
    logoAccent: "#7a4e0c",
  },
  hunter: {
    parchment: "#e5f4f2",
    card: "#f3fbfa",
    ink: "#062e32",
    inkSoft: "#1a5560",
    grove: "#0c6a74",
    groveDeep: "#08444c",
    gold: "#0c5c68",
    goldSoft: "#c5ebe6",
    line: "#b5d6d4",
    calm: "#146878",
    buttonText: "#ffffff",
    logoInk: "#08444c",
    logoAccent: "#0c6a78",
  },
  agnes: {
    parchment: "#eef6d8",
    card: "#f8fcec",
    ink: "#1c3214",
    inkSoft: "#3a5428",
    grove: "#1f7a32",
    groveDeep: "#145c22",
    gold: "#6a5210",
    goldSoft: "#e4ef9a",
    line: "#c9dba0",
    calm: "#3d6b40",
    buttonText: "#ffffff",
    logoInk: "#145c22",
    logoAccent: "#6a5210",
  },
  judah: {
    parchment: "#fbe8d4",
    card: "#fff6ee",
    ink: "#3a1214",
    inkSoft: "#6b2e2e",
    grove: "#9a2434",
    groveDeep: "#6e1420",
    gold: "#7a4e10",
    goldSoft: "#f6d7a4",
    line: "#e8cbb4",
    calm: "#8a4038",
    buttonText: "#ffffff",
    logoInk: "#6e1420",
    logoAccent: "#7a4e10",
  },
  zion: {
    parchment: "#e7f0fb",
    card: "#f5f9ff",
    ink: "#102844",
    inkSoft: "#2a4c70",
    grove: "#1a5eaa",
    groveDeep: "#123e72",
    gold: "#1a5878",
    goldSoft: "#cfe4f8",
    line: "#c5d6ea",
    calm: "#3d6d94",
    buttonText: "#ffffff",
    logoInk: "#123e72",
    logoAccent: "#1a5878",
  },
  shalom: {
    parchment: "#f6ecdf",
    card: "#fff8f1",
    ink: "#3a322c",
    inkSoft: "#5c4e44",
    grove: "#8a4e32",
    groveDeep: "#5c3424",
    gold: "#7a5430",
    goldSoft: "#f0d8bc",
    line: "#e4d0bc",
    calm: "#7a6454",
    buttonText: "#ffffff",
    logoInk: "#5c3424",
    logoAccent: "#7a5430",
  },
};

export const TEXT_PAIRS: { name: string; fg: keyof ThemeColors; bg: keyof ThemeColors; minimum: number }[] = [
  { name: "body on page", fg: "ink", bg: "parchment", minimum: 4.5 },
  { name: "body on card", fg: "ink", bg: "card", minimum: 4.5 },
  { name: "secondary on page", fg: "inkSoft", bg: "parchment", minimum: 4.5 },
  { name: "secondary on card", fg: "inkSoft", bg: "card", minimum: 4.5 },
  { name: "heading on page", fg: "groveDeep", bg: "parchment", minimum: 4.5 },
  { name: "heading on card", fg: "groveDeep", bg: "card", minimum: 4.5 },
  { name: "accent label on page", fg: "gold", bg: "parchment", minimum: 4.5 },
  { name: "button label", fg: "buttonText", bg: "grove", minimum: 4.5 },
  { name: "logo ink", fg: "logoInk", bg: "parchment", minimum: 3 },
  { name: "logo accent", fg: "logoAccent", bg: "parchment", minimum: 3 },
];

export function themeForMascot(mascot: string | null | undefined): ThemeId {
  if (mascot === "hunter" || mascot === "agnes" || mascot === "judah" || mascot === "zion" || mascot === "shalom") {
    return mascot;
  }
  return "default";
}

export function applyTheme(theme: ThemeId): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

/** Runs in the document head so the mascot theme is set before first paint. */
export const THEME_BOOT = `(function(){try{var raw=localStorage.getItem("bible-trivia-v1");var mascot=raw&&JSON.parse(raw).mascot;var known={hunter:1,agnes:1,judah:1,zion:1,shalom:1};document.documentElement.dataset.theme=known[mascot]?mascot:"default";}catch(e){document.documentElement.dataset.theme="default";}})();`;

function channel(hex: string, index: number): number {
  const value = Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) =>
    0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export function themeStyle(theme: ThemeId): Record<string, string> {
  const colors = THEMES[theme];
  return {
    "--parchment": colors.parchment,
    "--card": colors.card,
    "--ink": colors.ink,
    "--ink-soft": colors.inkSoft,
    "--grove": colors.grove,
    "--grove-deep": colors.groveDeep,
    "--gold": colors.gold,
    "--gold-soft": colors.goldSoft,
    "--line": colors.line,
    "--calm": colors.calm,
    "--button-text": colors.buttonText,
    "--logo-ink": colors.logoInk,
    "--logo-accent": colors.logoAccent,
  };
}

export type { MascotId };
