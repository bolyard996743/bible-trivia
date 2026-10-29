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
    parchment: "#f4efe4",
    card: "#fffaf3",
    ink: "#241c14",
    inkSoft: "#5c5146",
    grove: "#2f5d45",
    groveDeep: "#1e3d2d",
    gold: "#6d5318",
    goldSoft: "#f3e6c8",
    line: "#e3d5c0",
    calm: "#3e5c73",
    buttonText: "#ffffff",
    logoInk: "#1e3d2d",
    logoAccent: "#6d5318",
  },
  hunter: {
    parchment: "#e5f6f8",
    card: "#f4fcfd",
    ink: "#062e36",
    inkSoft: "#1a5560",
    grove: "#0b4f5e",
    groveDeep: "#08343c",
    gold: "#0e5c6a",
    goldSoft: "#d4eef3",
    line: "#b7d6de",
    calm: "#1d6a78",
    buttonText: "#ffffff",
    logoInk: "#08343c",
    logoAccent: "#0e6a78",
  },
  agnes: {
    parchment: "#f2f6e8",
    card: "#fbfdf4",
    ink: "#1c3214",
    inkSoft: "#3c582e",
    grove: "#1f5c28",
    groveDeep: "#163f1c",
    gold: "#5a4a12",
    goldSoft: "#e6efc4",
    line: "#c9d7b0",
    calm: "#3d6b48",
    buttonText: "#ffffff",
    logoInk: "#1a4a22",
    logoAccent: "#6a5614",
  },
  judah: {
    parchment: "#fbf4ea",
    card: "#fff9f3",
    ink: "#3a1214",
    inkSoft: "#6b2e2e",
    grove: "#7a1c28",
    groveDeep: "#541018",
    gold: "#7a5410",
    goldSoft: "#f3e2c0",
    line: "#e4cfc0",
    calm: "#8a4038",
    buttonText: "#ffffff",
    logoInk: "#6e1824",
    logoAccent: "#8a5e12",
  },
  zion: {
    parchment: "#f3f7fb",
    card: "#ffffff",
    ink: "#102844",
    inkSoft: "#2a4c70",
    grove: "#1a4e86",
    groveDeep: "#123656",
    gold: "#1c5874",
    goldSoft: "#d9e8f5",
    line: "#c5d6e6",
    calm: "#3d6d94",
    buttonText: "#ffffff",
    logoInk: "#143e66",
    logoAccent: "#1c5874",
  },
  shalom: {
    parchment: "#f7f4ee",
    card: "#fffcf8",
    ink: "#3a322c",
    inkSoft: "#5c5148",
    grove: "#5c4638",
    groveDeep: "#3e3026",
    gold: "#6e5434",
    goldSoft: "#efe4d4",
    line: "#e2d6c6",
    calm: "#7a6856",
    buttonText: "#ffffff",
    logoInk: "#4a382c",
    logoAccent: "#7a5c38",
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
