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

/** Draws the share image. The only words are the brand and the badge line. */
export function drawBadgeShareCard(ctx: ShareCardCanvas, input: { name: string; width: number; height: number }): string[] {
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

  ctx.beginPath();
  ctx.arc(input.width / 2, 390, 92, 0, Math.PI * 2);
  ctx.fillStyle = "#f6d48a";
  ctx.fill();
  ctx.strokeStyle = "#7a4e0c";
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.fillStyle = "#2a1c12";
  ctx.font = "600 40px Georgia, serif";
  const lines = wrapLine(ctx, line, input.width - 160);
  lines.forEach((row, index) => {
    ctx.fillText(row, input.width / 2, 620 + index * 52);
  });
  return drawn;
}

export async function renderBadgeShareFile(name: string): Promise<File | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 960;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawBadgeShareCard(ctx as unknown as ShareCardCanvas, { name, width: 720, height: 960 });
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
