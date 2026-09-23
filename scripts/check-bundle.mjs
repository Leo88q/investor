/**
 * Bundle budget gate (requirement f-11).
 *
 * The landing must stay light enough to hit LCP under 2.5 s on a mid-range
 * phone: JavaScript under 200 kB gzip and CSS under 40 kB gzip. The limits are
 * deliberately hard, so a new dependency cannot quietly eat the budget.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const LIMITS = { js: 200 * 1024, css: 40 * 1024 };
const DIST = "dist/assets";

async function gzippedBytes(file) {
  return gzipSync(await readFile(file)).length;
}

let files;
try {
  files = await readdir(DIST);
} catch {
  console.error(`check-bundle: ${DIST} not found — run \`npm run build\` first.`);
  process.exit(1);
}

const totals = { js: 0, css: 0 };
const rows = [];
for (const file of files) {
  const path = join(DIST, file);
  if (!(await stat(path)).isFile()) continue;
  const extension = file.split(".").pop();
  if (!(extension in LIMITS)) continue;
  const bytes = await gzippedBytes(path);
  totals[extension] += bytes;
  rows.push([file, bytes]);
}

const fmt = (bytes) => `${(bytes / 1024).toFixed(2)} kB gzip`;
let failed = false;
for (const [file, bytes] of rows.sort((a, b) => b[1] - a[1])) {
  console.log(`  ${file} — ${fmt(bytes)}`);
}
for (const [extension, limit] of Object.entries(LIMITS)) {
  const status = totals[extension] <= limit ? "OK" : "FAIL";
  console.log(
    `check-bundle: ${extension} total ${fmt(totals[extension])} / limit ${fmt(limit)} — ${status}`,
  );
  if (totals[extension] > limit) failed = true;
}
if (failed) process.exit(1);
