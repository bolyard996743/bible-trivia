import fs from "fs";
import path from "path";

const TRACE_CANDIDATES = [
  ".next/server/app/play/page.js.nft.json",
  ".next/server/app/play/page.nft.json",
];

/** Directories loadCatalog() reads at runtime. The trace must list files inside each. */
const REQUIRED = ["content/questions", "content/mascots"] as const;

export function contentTraceGaps(files: readonly string[]): string[] {
  const normalized = files.map((file) => file.split(path.sep).join("/").split("\\").join("/"));
  return REQUIRED.filter(
    (dir) => !normalized.some((file) => file.includes(`${dir}/`) && file.endsWith(".json")),
  );
}

export function readTraceFiles(tracePath: string): string[] {
  const parsed = JSON.parse(fs.readFileSync(tracePath, "utf8")) as unknown;
  if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")) return parsed;
  if (
    parsed &&
    typeof parsed === "object" &&
    "files" in parsed &&
    Array.isArray(parsed.files) &&
    parsed.files.every((entry) => typeof entry === "string")
  ) {
    return parsed.files;
  }
  throw new Error(`${tracePath} has no string files list`);
}

export function findPlayTrace(root: string): string | null {
  for (const relative of TRACE_CANDIDATES) {
    const full = path.join(root, relative);
    if (fs.existsSync(full)) return full;
  }
  const server = path.join(root, ".next", "server");
  const found: string[] = [];
  const walk = (current: string) => {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".nft.json") && full.includes(`${path.sep}play${path.sep}`)) {
        found.push(full);
      }
    }
  };
  walk(server);
  return found.find((file) => file.endsWith(`${path.sep}page.js.nft.json`)) ?? found[0] ?? null;
}

function main() {
  const root = process.cwd();
  const tracePath = findPlayTrace(root);
  if (!tracePath) {
    console.error("Content trace check failed: no /play NFT trace under .next/server.");
    process.exit(1);
  }
  const files = readTraceFiles(tracePath);
  const gaps = contentTraceGaps(files);
  if (gaps.length > 0) {
    console.error(`Content trace check failed: ${path.relative(root, tracePath)} omits ${gaps.join(", ")}.`);
    process.exit(1);
  }
  const counts = REQUIRED.map((dir) => {
    const count = files.filter((file) => file.split("\\").join("/").includes(`${dir}/`)).length;
    return `${count} ${dir}`;
  }).join(", ");
  console.log(`Play trace includes ${counts} (${path.relative(root, tracePath)}).`);
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("check-content-trace.ts") || entry.endsWith("check-content-trace.js")) {
  main();
}
