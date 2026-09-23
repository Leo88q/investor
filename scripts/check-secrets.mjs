/**
 * Secret gate.
 *
 * The repo must never contain a private key, a seed phrase, an API token or a
 * populated `.env` file. Mint authority keys are the highest-risk case: they
 * never belong in a public repository, in history or in a build artefact.
 *
 * Runs in `npm test` and in CI, and fails the build on a match.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  ".playwright",
  ".vite",
  "coverage",
]);

const SKIP_FILES = new Set(["package-lock.json", "scripts/check-secrets.mjs"]);

const TEXT_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".html",
  ".css",
  ".yml",
  ".yaml",
  ".env",
  ".example",
  ".txt",
]);

const PATTERNS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "PEM private key"],
  [/\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/, "GitHub token"],
  [/\bsk-[A-Za-z0-9]{20,}\b/, "OpenAI-style key"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, "Slack token"],
  [/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./, "JWT"],
  // A base58 blob long enough to be a Solana keypair or seed.
  [/\b[1-9A-HJ-NP-Za-km-z]{80,}\b/, "base58 secret (Solana keypair or seed)"],
  [
    /\b(?:seed phrase|mnemonic)\b[^\n]{0,40}\b[a-z]{3,8}(?:\s+[a-z]{3,8}){5,}\b/i,
    "seed phrase",
  ],
];

/** Any `.env*` file must stay empty except for documented placeholders. */
const ENV_ALLOWED = /^(?:#.*|\s*|VITE_[A-Z0-9_]*=\s*(?:false|true|""|''|)$)+$/;

const findings = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const relativePath = relative(process.cwd(), path);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(path);
      continue;
    }
    if (!entry.isFile() || SKIP_FILES.has(relativePath)) continue;
    const name = entry.name;
    if (name.startsWith(".env") && name !== ".env.example") {
      const body = await readFile(path, "utf8");
      if (!ENV_ALLOWED.test(body))
        findings.push(`${relativePath}: a populated .env file must not be committed`);
    }
    const extension = name.includes(".") ? `.${name.split(".").pop()}` : "";
    if (!TEXT_EXTENSIONS.has(extension) && !name.startsWith(".env")) continue;
    const body = await readFile(path, "utf8");
    for (const [pattern, label] of PATTERNS) {
      const match = body.match(pattern);
      if (match)
        findings.push(`${relativePath}: possible ${label} — "${match[0].slice(0, 24)}…"`);
    }
  }
}

await walk(process.cwd());

if (findings.length > 0) {
  console.error("check-secrets: FAILED");
  for (const finding of findings) console.error(`  - ${finding}`);
  console.error(
    "\nNo secret, private key or mint authority belongs in this repository.",
  );
  process.exit(1);
}

console.log("check-secrets: OK — no keys, tokens, seed phrases or populated .env files.");
