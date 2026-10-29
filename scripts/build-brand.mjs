import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const brand = path.join(root, "public/brand");
const icons = path.join(root, "public/icons");
const sources = {
  logo: path.join(brand, "logo-full-source.jpg"),
  icon: path.join(brand, "icon-source.jpg"),
};
const cream = { r: 0xf3, g: 0xef, b: 0xe4, alpha: 1 };

await mkdir(brand, { recursive: true });
await mkdir(icons, { recursive: true });

function colorDistance(r, g, b, bg) {
  return Math.hypot(r - bg[0], g - bg[1], b - bg[2]);
}

async function knockOutBackground(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bg = [data[0], data[1], data[2]];
  const pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
    const distance = colorDistance(pixels[i], pixels[i + 1], pixels[i + 2], bg);
    if (distance <= 14) pixels[i + 3] = 0;
    else if (distance < 36) pixels[i + 3] = Math.round(((distance - 14) / 22) * 255);
  }
  const trimmed = await sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .png()
    .toBuffer();
  return sharp(trimmed)
    .extend({ top: 2, bottom: 2, left: 2, right: 2, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function fitOnSquare(source, size, paddingRatio) {
  const inner = Math.max(1, Math.round(size * (1 - paddingRatio * 2)));
  const emblem = await sharp(source)
    .resize({ width: inner, height: inner, fit: "inside" })
    .png()
    .toBuffer();
  const fitted = await sharp(emblem).metadata();
  if (fitted.width > size || fitted.height > size) {
    throw new Error(`Emblem ${fitted.width}x${fitted.height} does not fit in ${size}`);
  }
  return sharp({
    create: { width: size, height: size, channels: 4, background: cream },
  })
    .composite([{ input: emblem, gravity: "center" }])
    .png();
}

function icoFromPngs(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  let offset = 6 + 16 * count;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

const logo = await knockOutBackground(sources.logo);
const icon = await knockOutBackground(sources.icon);
const logoMeta = await sharp(logo).metadata();
const logoHeight2x = 160;
const logoWidth2x = Math.round((logoMeta.width / logoMeta.height) * logoHeight2x);
const logoHeight1x = 80;
const logoWidth1x = Math.round((logoMeta.width / logoMeta.height) * logoHeight1x);

const logoRaw = await sharp(logo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
function maskFrom(kind) {
  const pixels = Buffer.alloc(logoRaw.data.length);
  for (let i = 0; i < logoRaw.data.length; i += 4) {
    const r = logoRaw.data[i];
    const g = logoRaw.data[i + 1];
    const b = logoRaw.data[i + 2];
    const alpha = logoRaw.data[i + 3];
    const gold = alpha > 20 && r > 130 && g > 80 && r > b + 25 && g > b + 10;
    const keep = kind === "accent" ? gold : alpha > 20 && !gold;
    pixels[i] = 255;
    pixels[i + 1] = 255;
    pixels[i + 2] = 255;
    pixels[i + 3] = keep ? alpha : 0;
  }
  return sharp(pixels, {
    raw: { width: logoRaw.info.width, height: logoRaw.info.height, channels: 4 },
  })
    .resize({ height: logoHeight2x })
    .png()
    .toBuffer();
}
await writeFile(path.join(brand, "logo-ink-mask.png"), await maskFrom("ink"));
await writeFile(path.join(brand, "logo-accent-mask.png"), await maskFrom("accent"));

await sharp(logo).resize({ height: logoHeight2x }).webp({ lossless: true }).toFile(path.join(brand, "logo-header@2x.webp"));
await sharp(logo).resize({ height: logoHeight1x }).webp({ lossless: true }).toFile(path.join(brand, "logo-header.webp"));
await sharp(logo).resize({ height: logoHeight2x }).png().toFile(path.join(brand, "logo-header@2x.png"));

const maskablePadding = 0.22;
const sizes = [16, 32, 48, 180, 192, 512];
const pngs = {};
for (const size of sizes) {
  const padding = size <= 32 ? 0.02 : size <= 48 ? 0.04 : 0.08;
  pngs[size] = await (await fitOnSquare(icon, size, padding)).toBuffer();
}
const maskable = await (await fitOnSquare(icon, 512, maskablePadding)).toBuffer();

await writeFile(path.join(icons, "favicon-16.png"), pngs[16]);
await writeFile(path.join(icons, "favicon-32.png"), pngs[32]);
await writeFile(path.join(icons, "favicon-48.png"), pngs[48]);
await writeFile(path.join(root, "public/apple-touch-icon.png"), pngs[180]);
await writeFile(path.join(icons, "icon-192.png"), pngs[192]);
await writeFile(path.join(icons, "icon-512.png"), pngs[512]);
await writeFile(path.join(icons, "icon-maskable-512.png"), maskable);
await writeFile(
  path.join(root, "public/favicon.ico"),
  icoFromPngs([
    { size: 16, png: pngs[16] },
    { size: 32, png: pngs[32] },
    { size: 48, png: pngs[48] },
  ]),
);

console.log(
  JSON.stringify(
    {
      logo1x: [logoWidth1x, logoHeight1x],
      logo2x: [logoWidth2x, logoHeight2x],
      source: [logoMeta.width, logoMeta.height],
    },
    null,
    2,
  ),
);
