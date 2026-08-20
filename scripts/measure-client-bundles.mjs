import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const serverApp = join(root, ".next/server/app");
const staticRoot = join(root, ".next/static");
const requested = process.argv.slice(2);

if (!existsSync(serverApp)) {
  console.error("Build não encontrado. Execute `npm run build` antes da medição.");
  process.exit(1);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const manifests = new Map();
for (const file of walk(serverApp).filter((path) => path.endsWith("client-reference-manifest.js"))) {
  const source = readFileSync(file, "utf8");
  const match = source.match(/__RSC_MANIFEST\["([^"]+)"\]\s*=\s*(\{.*\});?\s*$/s);
  if (!match) continue;
  manifests.set(match[1], JSON.parse(match[2]));
}

const defaults = ["/page", "/(marketing)/blog/page", "/courses/[id]/lessons/[lessonId]/page"];
const routes = requested.length ? requested : defaults;

for (const route of routes) {
  const manifest = manifests.get(route);
  if (!manifest) {
    console.log(`${route}: manifest não encontrado`);
    continue;
  }
  const chunks = new Set();
  for (const clientModule of Object.values(manifest.clientModules ?? {})) {
    for (const chunk of clientModule.chunks ?? []) chunks.add(chunk);
  }
  let raw = 0;
  let gzip = 0;
  for (const chunk of chunks) {
    const normalized = String(chunk)
      .replace(/^\/_next\/static\//, "")
      .replace(/^static\//, "");
    const path = join(staticRoot, normalized);
    if (!existsSync(path)) continue;
    raw += statSync(path).size;
    gzip += gzipSync(readFileSync(path)).length;
  }
  console.log(`${route}: ${chunks.size} chunks · ${(raw / 1024).toFixed(1)} KiB raw · ${(gzip / 1024).toFixed(1)} KiB gzip`);
}
