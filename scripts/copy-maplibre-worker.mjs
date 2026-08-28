import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * MapLibre 6 loads `maplibre-gl-worker.mjs` as a sibling of the library URL.
 * Next bundles the library into a hashed chunk, so that sibling 404s (HTML
 * MIME) and the canvas stays empty. Serving the worker from `/maplibre/`
 * keeps the import graph intact.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules/maplibre-gl/dist");
const to = join(root, "public/maplibre");
mkdirSync(to, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(from, file), join(to, file));
}
