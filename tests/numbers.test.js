/**
 * Guards for the "no numbers without a source" rule.
 *
 * These tests prove three things:
 *   1. the shipped copy passes the registry linter;
 *   2. the linter actually fails on an invented figure (it is not a no-op);
 *   3. the registry itself is complete and never drifts from config.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintFiles, registryProblems } from "../scripts/check-numbers.mjs";
import { NUMBERS, QUALITY, API_TOKENS } from "../src/numbers.js";
import { config, sharePerNft } from "../src/config.js";

test("the shipped copy has no number without a source", async () => {
  const problems = await lintFiles();
  assert.deepEqual(problems, []);
});

test("the registry is complete and consistent with the deal config", () => {
  assert.deepEqual(registryProblems, []);
  for (const [token, entry] of Object.entries(NUMBERS)) {
    assert.ok(entry.source, `${token} must declare a source`);
    assert.ok(entry.asOf, `${token} must declare an asOf date`);
    assert.ok(
      [QUALITY.COMPLETE, QUALITY.PARTIAL, QUALITY.UNAVAILABLE].includes(entry.quality),
      `${token} has an unknown quality`,
    );
    assert.equal(typeof entry.demo, "boolean", `${token} must declare demo`);
  }
  assert.equal(NUMBERS.price.value, config.price);
  assert.equal(NUMBERS.supply.value, config.supply);
  assert.equal(NUMBERS.poolPercent.value, config.poolPercent);
  assert.equal(NUMBERS.walletLimit.value, config.walletLimit);
  assert.equal(NUMBERS.target.value, config.target);
  assert.equal(NUMBERS.sharePerNft.value, sharePerNft);
});

test("nothing is flagged as demo unless it comes from the hub", () => {
  for (const [token, entry] of Object.entries(NUMBERS)) {
    if (entry.origin !== "api") continue;
    assert.equal(entry.demo, true, `${token} is API-backed and must be demo-flagged`);
  }
  assert.equal(NUMBERS.games.demo, false);
  assert.equal(NUMBERS.price.demo, false);
});

test("API tokens are declared but never carry a literal value", () => {
  for (const token of API_TOKENS) {
    // They are filled from the hub at render time; a literal here would be
    // an invented figure waiting to be printed.
    assert.equal(NUMBERS[token], undefined, `${token} must not have a registry value`);
  }
});

test("an invented figure fails the linter", async () => {
  const dir = await mkdtemp(join(tmpdir(), "numbers-"));
  const file = join(dir, "copy.jsx");
  await writeFile(
    file,
    'export const a = <p>2 500 000 активных игроков и доход $3,400,000</p>;\n',
  );
  const problems = await lintFiles([file]);
  const reported = problems.map((line) => line.split("number ")[1].split(" has")[0]);
  assert.deepEqual(reported.sort(), ['"2500000"', '"3,400,000"']);
});

test("layout values are not treated as claims", async () => {
  const dir = await mkdtemp(join(tmpdir(), "numbers-"));
  const file = join(dir, "layout.jsx");
  await writeFile(
    file,
    'export const a = <div className="x" style={{ width: "17%" }} aria-label="3 items">' +
      '<img width={418} height={941} alt="a" /></div>;\n',
  );
  assert.deepEqual(await lintFiles([file]), []);
});

test("a number that matches the registry is accepted", async () => {
  const dir = await mkdtemp(join(tmpdir(), "numbers-"));
  const file = join(dir, "ok.jsx");
  await writeFile(
    file,
    `export const a = <p>${config.supply} NFT и ${config.target} в пул</p>;\n`,
  );
  assert.deepEqual(await lintFiles([file]), []);
});
