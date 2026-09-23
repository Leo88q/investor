import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateShare,
  calculateTieredShare,
  explainShare,
  getLanguage,
  money,
  moneyOrDash,
  percent,
  stampUtc,
  roundDown,
  firstBusinessDay,
  snapshotDates,
  nextSnapshot,
  quarterForMonth,
  TIERED_FALLBACK,
  TIERED_WEIGHT_TOTAL,
} from "../src/math.js";
import { config } from "../src/config.js";
import { content } from "../src/content.js";
test("brief scenarios and no double deduction", () => {
  assert.deepEqual(calculateShare(100000), {
    pool: 25000,
    annual: 250,
    quarterly: 62.5,
  });
  assert.deepEqual(calculateShare(200000), {
    pool: 50000,
    annual: 500,
    quarterly: 125,
  });
  assert.deepEqual(calculateShare(400000), {
    pool: 100000,
    annual: 1000,
    quarterly: 250,
  });
});
test("zero and losses never pay a dividend", () => {
  for (const profit of [0, -100000, NaN, undefined])
    assert.deepEqual(calculateShare(profit), {
      pool: 0,
      annual: 0,
      quarterly: 0,
    });
});
test("price formatting uses USD notation independent of language", () => {
  assert.equal(money(100000), "$100,000");
  assert.equal(money(62.5, 2), "$62.5");
});
test("language defaults to RU and supports a shareable query and static EN entry", () => {
  assert.equal(getLanguage(""), "ru");
  assert.equal(getLanguage("?lang=en"), "en");
  assert.equal(getLanguage("?lang=de"), "ru");
  assert.equal(getLanguage("?other=x&lang=ru"), "ru");
  assert.equal(getLanguage("", "/en.html"), "en");
  assert.equal(getLanguage("?lang=ru", "/en.html"), "ru");
});
function shape(value) {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, shape(v)]),
    );
  return typeof value;
}
test("every Russian copy key has an English counterpart", () =>
  assert.deepEqual(shape(content.ru), shape(content.en)));
test("game stages match studio brief", () => {
  for (const language of ["ru", "en"])
    assert.deepEqual(
      content[language].games.map((g) => g.stage),
      ["beta", "prototype", "prototype", "alpha"],
    );
});

test("rounding is always down, so a payout can never overdraw the pool", () => {
  assert.equal(roundDown(62.5), 62.5);
  assert.equal(roundDown(0.999), 0.99);
  assert.equal(roundDown(1 / 3), 0.33);
  assert.equal(roundDown(-5), 0);
  assert.equal(roundDown(NaN), 0);
  // A profit that produces a repeating fraction never rounds up.
  const share = calculateShare(100001, config.supply, config.poolPercent);
  assert.equal(share.pool, 25000.25);
  assert.equal(share.annual, 250);
  assert.ok(share.quarterly <= 250.0025 / 4);
});

test("supply is clamped to the emitted drop and never divides by zero", () => {
  assert.deepEqual(calculateShare(200000, 0), { pool: 0, annual: 0, quarterly: 0 });
  assert.deepEqual(calculateShare(200000, -10), { pool: 0, annual: 0, quarterly: 0 });
  const max = calculateShare(200000, 5000);
  assert.equal(max.annual, 50000 / config.supply);
  assert.equal(calculateShare(200000, config.supply).annual, 500);
});

test("tiny profits floor to zero instead of paying a fraction of a cent", () => {
  assert.deepEqual(calculateShare(0.01), { pool: 0, annual: 0, quarterly: 0 });
  assert.equal(calculateShare(4).pool, 1);
  assert.equal(calculateShare(4).annual, 0.01);
});

test("the explanation states the brief formula and the zero reason", () => {
  const explained = explainShare(200000, config.supply, config.poolPercent);
  assert.equal(explained.formula, "dividend = (net profit × 25%) / 100");
  assert.match(explained.formulaQuarterly, /quarterly/);
  assert.equal(explained.rounding, "floor to 2 decimals");
  assert.equal(explained.zeroReason, null);
  const zero = explainShare(0);
  assert.equal(zero.quarterly, 0);
  assert.match(zero.zeroReason, /dividend is \$0/);
});

test("the tiered fallback documents the weighted variant", () => {
  assert.equal(TIERED_WEIGHT_TOTAL, 195);
  assert.equal(TIERED_FALLBACK.length, 3);
  const tiered = calculateTieredShare(200000, TIERED_FALLBACK, config.poolPercent);
  assert.equal(tiered.pool, 50000);
  assert.equal(tiered.totalWeight, 195);
  assert.equal(tiered.perWeight, 256.41);
  assert.equal(tiered.tiers[0].quarterly, 64.1);
  assert.equal(calculateTieredShare(0).pool, 0);
});

test("snapshots fall on the first business day of January, April, July and October", () => {
  const dates = snapshotDates(2027);
  assert.deepEqual(
    dates.map((item) => item.date.toISOString().slice(0, 10)),
    ["2027-01-01", "2027-04-01", "2027-07-01", "2027-10-01"],
  );
  assert.deepEqual(
    snapshotDates(2028).map((item) => item.date.toISOString().slice(0, 10)),
    // 1 Jan 2028 is a Saturday, 1 April 2028 a Saturday, 1 July a Saturday.
    ["2028-01-03", "2028-04-03", "2028-07-03", "2028-10-02"],
  );
  for (const item of snapshotDates(2029)) {
    const day = item.date.getUTCDay();
    assert.ok(day >= 1 && day <= 5, `${item.date.toISOString()} is a weekend`);
  }
  assert.deepEqual(
    config.snapshot.months.map(quarterForMonth),
    [1, 2, 3, 4],
  );
  assert.equal(firstBusinessDay(2027, 1).toISOString(), "2027-01-01T00:00:00.000Z");
});

test("the next snapshot is strictly in the future", () => {
  const next = nextSnapshot(new Date("2027-02-15T00:00:00Z"));
  assert.equal(next.date.toISOString(), "2027-04-01T00:00:00.000Z");
  assert.equal(quarterForMonth(next.month), 2);
  const after = nextSnapshot(new Date("2027-12-31T00:00:00Z"));
  assert.equal(after.date.toISOString(), "2028-01-03T00:00:00.000Z");
});

test("missing values are printed as dashes, never as zero", () => {
  assert.equal(moneyOrDash(null), "—");
  assert.equal(moneyOrDash(undefined), "—");
  assert.equal(moneyOrDash(0), "$0");
  assert.equal(percent(null), "—");
  assert.equal(percent(25), "25.00%");
  assert.equal(stampUtc("2027-01-01T00:00:00.000Z"), "2027-01-01 00:00 UTC");
  assert.equal(stampUtc("nonsense"), null);
});
