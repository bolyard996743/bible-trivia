import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { BadgeEmblem } from "@/components/BadgeEmblem";
import { badgeLook } from "@/lib/game/badge-look";

export type ShareCardCanvas = {
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  arc(x: number, y: number, radius: number, start: number, end: number): void;
  fill(): void;
  stroke(): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
  drawImage(image: unknown, x: number, y: number, width: number, height: number): void;
};

export type ShareCardImage = {
  src?: string;
};

export function shareCardLine(name: string): string {
  const trimmed = name.trim();
  if (/^(the|a|an)\b/i.test(trimmed)) return `I earned ${trimmed} badge!`;
  return `I earned the ${trimmed} badge!`;
}

function wrapLine(ctx: ShareCardCanvas, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

/**
 * The shelf medallion as one SVG document.
 * Colors are written in, so the picture does not depend on the page stylesheet
 * and does not fetch anything.
 */
export function badgeMedallionSvg(topic: string, slug = ""): string {
  if (typeof document === "undefined") return "";
  const look = badgeLook(topic, slug);
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  flushSync(() => {
    root.render(createElement(BadgeEmblem, { topic, slug, status: "earned" }));
  });
  const svg = host.querySelector("svg");
  if (svg) {
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", "240");
    svg.setAttribute("height", "240");
  }
  const raw = svg?.outerHTML ?? "";
  root.unmount();
  host.remove();
  const colored = raw
    .replaceAll("var(--badge-ink)", look.palette.ink)
    .replaceAll("var(--badge-wash)", look.palette.wash)
    .replaceAll("var(--badge-accent)", look.palette.accent);
  return colored
    .replace(/id="([^"]+)"/g, (_, id: string) => `id="${safeSvgId(id)}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id: string) => `url(#${safeSvgId(id)})`);
}

function safeSvgId(id: string): string {
  return `m${id.replace(/[^a-zA-Z0-9]/g, "")}`;
}

/** Inline SVG. A data URL stays on this device and does not taint the canvas. */
export function badgeMedallionUrl(topic: string, slug = ""): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(badgeMedallionSvg(topic, slug))}`;
}

function loadInlineImage(src: string): Promise<ShareCardImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("badge art"));
    image.src = src;
  });
}

/** Draws the share image. The only words are the brand and the badge line. */
export async function drawBadgeShareCard(
  ctx: ShareCardCanvas,
  input: {
    name: string;
    topic: string;
    slug: string;
    width: number;
    height: number;
    loadImage?: (src: string) => Promise<ShareCardImage>;
  },
): Promise<string[]> {
  const line = shareCardLine(input.name);
  const drawn: string[] = ["Noble Bereans", line];
  ctx.fillStyle = "#f8e6c6";
  ctx.fillRect(0, 0, input.width, input.height);
  ctx.fillStyle = "#fff7ea";
  ctx.fillRect(48, 48, input.width - 96, input.height - 96);
  ctx.strokeStyle = "#145c32";
  ctx.lineWidth = 8;
  ctx.strokeRect(48, 48, input.width - 96, input.height - 96);

  ctx.fillStyle = "#145c32";
  ctx.font = "600 56px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Noble Bereans", input.width / 2, 180);

  const src = badgeMedallionUrl(input.topic, input.slug);
  const image = await (input.loadImage ?? loadInlineImage)(src);
  const size = 220;
  ctx.drawImage(image, input.width / 2 - size / 2, 280, size, size);

  ctx.fillStyle = "#2a1c12";
  ctx.font = "600 40px Georgia, serif";
  const lines = wrapLine(ctx, line, input.width - 160);
  lines.forEach((row, index) => {
    ctx.fillText(row, input.width / 2, 620 + index * 52);
  });
  return drawn;
}

export async function renderBadgeShareFile(name: string, topic: string, slug: string): Promise<File | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 960;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  await drawBadgeShareCard(ctx as unknown as ShareCardCanvas, { name, topic, slug, width: 720, height: 960 });
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), "image/png");
  });
  if (!blob) return null;
  return new File([blob], "noble-bereans-badge.png", { type: "image/png" });
}

export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name || "noble-bereans-badge.png";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dismissed(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && (error as { name: unknown }).name === "AbortError";
}

export async function presentBadgeShare(input: {
  file: File;
  text: string;
  canShare?: (data: { files: File[] }) => boolean;
  share?: (data: { files: File[]; title: string; text: string }) => Promise<void>;
  download?: (file: File) => void;
}): Promise<"shared" | "downloaded" | "dismissed" | "failed"> {
  const allowed = input.canShare ? input.canShare({ files: [input.file] }) : false;
  if (allowed && input.share) {
    try {
      await input.share({ files: [input.file], title: "Noble Bereans", text: input.text });
      return "shared";
    } catch (error) {
      if (dismissed(error)) return "dismissed";
    }
  }
  if (!input.download) return "failed";
  try {
    input.download(input.file);
    return "downloaded";
  } catch {
    return "failed";
  }
}
