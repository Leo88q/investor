/**
 * "No numbers without a source" linter.
 *
 * The landing's core promise is that every figure can be traced. This script
 * is the automated part of that promise; it runs in `npm test` and in CI and
 * fails the build when a human-readable number appears that is not backed by
 * `src/numbers.js` (registry), `src/config.js` (deal parameters) or an
 * explicit, justified exception below.
 *
 * What it checks
 *   1. the registry is complete: every entry has value, source, quality, asOf,
 *      origin, and a `demo` flag that is true only for hub mock payloads;
 *   2. the registry does not drift from `src/config.js`;
 *   3. numbers found in the copy (`src/content.js`, `src/main.jsx`,
 *      `index.html`) resolve to the registry, to the config, or to an
 *      exception with a written reason.
 *
 * What it deliberately does not check: CSS geometry, hex colours, `${}`
 * interpolations, attribute values and JS expressions — those are layout, not
 * claims. Figures rendered from the API are checked by `tests/render.test.js`,
 * which asserts that every rendered metric carries a quality badge.
 */

import { readFile } from "node:fs/promises";
import { parse } from "@babel/parser";
import { NUMBERS, QUALITY } from "../src/numbers.js";
import { config, sharePerNft } from "../src/config.js";

const FILES = ["src/content.js", "src/main.jsx", "index.html"];

/** Numbers that are intentionally not registry entries, each with a reason. */
const EXCEPTIONS = {
  "01": "ordinal prefix of a section label",
  "02": "ordinal prefix of a section label",
  "03": "ordinal prefix of a section label",
  "04": "ordinal prefix of a section label (04 GAMES)",
  "05": "ordinal prefix of a section label",
  "06": "ordinal prefix of a section label",
  "07": "ordinal prefix of a section label",
  "08": "ordinal prefix of a section label",
  "09": "ordinal prefix of a section label",
  "10": "ordinal prefix of a section label",
  "0": "zero used as an ordinal prefix (0N) and in the $0 formula, not a claim",
  "2": "HTTP status code in an explanatory string",
  "404": "HTTP status code in the API error vocabulary",
  "5": "HTTP status code in the API error vocabulary",
  "300": "operations target published verbatim from the brief's SLO section",
  "99.9": "operations target published verbatim from the brief's SLO section",
  "25": "the pool percentage is a config value; duplicate literal only in formulas",
  "100": "supply duplicate inside the brief's verbatim formula string",
  "4": "quarter count inside the brief's verbatim formula string",
  "2026": "year in the copyright line and in planned dates from the registry",
  "2027": "year inside the planned roadmap dates from the registry",
  "3": "duration range \"3–6 months\" from the brief's team budget line",
  "6": "duration range \"3–6 months\" from the brief's team budget line",
  "1,000": "unit price inside the illustration text, sourced from config.price",
};

const MONTHS = config.snapshot.months.join(", ");

const lineOf = (node) => (node.loc ? node.loc.start.line : null);

/* ------------------------------------------------------------------ *
 * 1 + 2. registry completeness and config parity
 * ------------------------------------------------------------------ */

const problems = [];
const allowed = new Set();

function addAllowed(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      addAllowed(...value);
      continue;
    }
    const text = String(value);
    allowed.add(text);
    const asNumber = Number(text.replaceAll(",", ""));
    if (Number.isFinite(asNumber)) allowed.add(String(asNumber));
  }
}

for (const [token, entry] of Object.entries(NUMBERS)) {
  if (!entry || typeof entry !== "object") {
    problems.push(`registry: ${token} is not an object`);
    continue;
  }
  if (entry.value === null || entry.value === undefined)
    problems.push(`registry: ${token} has no value`);
  if (!entry.source) problems.push(`registry: ${token} has no source`);
  if (!entry.asOf) problems.push(`registry: ${token} has no asOf date`);
  if (!QUALITY[String(entry.quality).toUpperCase()])
    problems.push(`registry: ${token} has unknown quality "${entry.quality}"`);
  if (!["config", "brief", "api"].includes(entry.origin))
    problems.push(`registry: ${token} has unknown origin "${entry.origin}"`);
  if (typeof entry.demo !== "boolean")
    problems.push(`registry: ${token} must declare a boolean demo flag`);
  if (entry.origin === "api" && entry.value !== null)
    problems.push(`registry: ${token} is API-backed and must not carry a literal value`);
  addAllowed(entry.value);
}

/** Registry must never contradict the single source of truth for the deal. */
const parity = [
  ["price", config.price],
  ["supply", config.supply],
  ["poolPercent", config.poolPercent],
  ["walletLimit", config.walletLimit],
  ["target", config.target],
  ["sharePerNft", sharePerNft],
];
for (const [token, expected] of parity) {
  const entry = NUMBERS[token];
  if (!entry) {
    problems.push(`registry: ${token} entry is missing`);
    continue;
  }
  if (Number(entry.value) !== Number(expected))
    problems.push(
      `registry: ${token} = ${entry.value} but src/config.js says ${expected}`,
    );
}

addAllowed(
  config.price,
  config.supply,
  config.poolPercent,
  config.walletLimit,
  config.target,
  sharePerNft,
  config.legal.restrictedJurisdictions.join(", "),
  MONTHS,
  MONTHS.replaceAll(", ", "/"),
);

/* ------------------------------------------------------------------ *
 * 3. copy scan
 * ------------------------------------------------------------------ */

const NUMBER_TOKEN =
  /(?<![\w#,])[$€]?(?:\d{1,3}(?:[ ,]\d{3})+|\d+)(?:\.\d+)?%?/g;

function clean(text) {
  return (
    text
      // template interpolations are code, not copy
      .replace(/\$\{[^}]*\}/gs, " ")
      // hex colours
      .replace(/#[0-9a-fA-F]{3,8}\b/g, " ")
      // versions and package ranges
      .replace(/\b[vV]?\d+\.\d+\.\d+(?:-[\w.]+)?\b/g, " ")
      // ISO timestamps and dates used as values, not claims
      .replace(/\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?/g, " ")
      // file references such as 00_HUB_CONTRACT.md
      .replace(/\b\w*_?\d{2,}[_A-Z]*\.\w+\b/g, " ")
      // css lengths and percentages that are pure geometry help
      .replace(/\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|ms|s)\b/g, " ")
      .replace(/(?<![\w$])0\.\d+(?=deg|fr)/g, " ")
      .replace(/initial-scale=\d+(?:\.\d+)?/g, " ")
  );
}

/**
 * Copy extraction.
 *
 * JS/JSX files are parsed, not regex-scanned: only `JSXText` nodes (raw copy
 * between tags), string literals and template chunks are claims. Attribute
 * values, CSS geometry and JS expressions are layout, and are skipped by
 * construction instead of by an ever-growing allowlist.
 */
function collectCopy(node, out, parent, ancestors = []) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) collectCopy(child, out, parent, ancestors);
    return;
  }
  const insideAttribute = ancestors.some((item) => item.type === "JSXAttribute");
  switch (node.type) {
    case "JSXText":
      if (/\S/.test(node.value)) out.push({ text: node.value, line: lineOf(node) });
      break;
    case "StringLiteral":
      // Attributes (className, style, src, geometry) are layout, not claims.
      if (!insideAttribute) out.push({ text: node.value, line: lineOf(node) });
      break;
    case "TemplateElement":
      out.push({
        text: node.value && node.value.cooked ? node.value.cooked : "",
        line: lineOf(node),
      });
      break;
    default:
      break;
  }
  const chain = [...ancestors, node];
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    if (value === null) continue;
    if (value && typeof value === "object" && value.type)
      collectCopy(value, out, node, chain);
    else if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === "object" && typeof child.type === "string")
          collectCopy(child, out, node, chain);
      }
    }
  }
}

function parseCopy(source, { jsx }) {
  const ast = parse(source, {
    sourceType: "module",
    plugins: jsx ? ["jsx"] : [],
  });
  const out = [];
  collectCopy(ast.program, out, null);
  return out;
}

/** `index.html`: text nodes plus `content="..."` values. */
function htmlCopy(source) {
  const withoutScripts = source
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const out = [];
  const withLines = (regex) => {
    for (const match of withoutScripts.matchAll(regex)) {
      const line = withoutScripts.slice(0, match.index).split("\n").length;
      out.push({ text: match[1], line });
    }
  };
  withLines(/>([^<]+)</g);
  withLines(/content="([^"]*)"/g);
  return out;
}

function scan(file, source) {
  const lines = source.split("\n");
  const ignore = new Set();
  lines.forEach((line, index) => {
    if (line.includes("numbers-lint-ignore")) ignore.add(index + 1);
  });
  const pieces = file.endsWith(".html")
    ? htmlCopy(source)
    : parseCopy(source, { jsx: file.endsWith(".jsx") });

  for (const piece of pieces) {
    const text = clean(piece.text);
    NUMBER_TOKEN.lastIndex = 0;
    let match;
    while ((match = NUMBER_TOKEN.exec(text))) {
      const raw = match[0]
        .replace(/^[$€]/, "")
        .replace(/[ ,]\d{3}(?![\d])/g, (group) => group.replace(" ", ""))
        .replace(/[,._]+$/, "")
        .replace(/%$/, "");
      const normalized = raw.replaceAll(",", "").replaceAll("_", "");
      if (allowed.has(raw) || allowed.has(normalized)) continue;
      if (EXCEPTIONS[raw] || EXCEPTIONS[normalized]) continue;
      const lineNumber = piece.line;
      if (ignore.has(lineNumber)) continue;
      problems.push(
        `${file}:${lineNumber || "?"} number "${raw}" has no registry entry ` +
          `(add it to src/numbers.js or justify it in EXCEPTIONS)`,
      );
    }
  }
}

/**
 * Lint the given files (defaults to the shipped copy). Exported so the test
 * suite can feed it synthetic sources and prove it actually fails on an
 * invented figure.
 */
export async function lintFiles(files = FILES) {
  const found = [];
  for (const file of files) {
    const before = problems.length;
    scan(file, await readFile(file, "utf8"));
    found.push(...problems.splice(before));
  }
  return found;
}

/** Registry problems discovered at import time (completeness + parity). */
export const registryProblems = [...problems];

/* ------------------------------------------------------------------ *
 * report
 * ------------------------------------------------------------------ */

const isCli =
  process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isCli) {
  const found = [...registryProblems, ...(await lintFiles())];
  if (found.length > 0) {
    console.error("check-numbers: FAILED");
    for (const problem of found) console.error(`  - ${problem}`);
    console.error(
      `\n${found.length} unresolved figure(s). The landing must not print a number it cannot source.`,
    );
    process.exit(1);
  }
  console.log(
    `check-numbers: OK — ${Object.keys(NUMBERS).length} registry entries, ` +
      `${FILES.length} files scanned, ${Object.keys(EXCEPTIONS).length} justified exceptions.`,
  );
}
