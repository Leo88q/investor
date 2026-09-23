/**
 * Dividend math, payout calendar and formatting.
 *
 * Brief formula (hub/INVESTOR_LANDING_BRIEF.md §1):
 *   Дивиденд на NFT за квартал = (Чистая прибыль студии за квартал × 25%) / 100
 * i.e. the studio pays 25% of net profit into the pool, split across the 100
 * NFTs of the single class. The hub computes the investor report with the same
 * formula (interlock i-05); this module must never diverge from it.
 *
 * Rounding policy: always DOWN to the cent. A dividend is never rounded up,
 * because rounding up would promise money the pool does not contain.
 */

import { config } from "./config.js";

export const SUPPLY_LIMIT = config.supply;
export const POOL_PERCENT = config.poolPercent;

/** Round down to `decimals` places, catching binary float drift. */
export function roundDown(value, decimals = 2) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  const factor = 10 ** decimals;
  // The epsilon guards cases like 62.5 * 100 = 6249.999999999999.
  return Math.floor(number * factor + 1e-9) / factor;
}

/** Net profit is a business input: losses and junk collapse to 0, never NaN. */
export function netProfit(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return number;
}

/** Supply is clamped to the emitted drop; 0 supply would divide by zero. */
export function clampSupply(supply = SUPPLY_LIMIT) {
  const number = Math.floor(Number(supply));
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.min(number, SUPPLY_LIMIT);
}

/**
 * Canonical share table. Return shape is frozen — `tests/math.test.js`
 * deep-equals `{pool, annual, quarterly}` and the UI reads these three keys.
 */
export function calculateShare(profit, supply = SUPPLY_LIMIT, poolPercent = POOL_PERCENT) {
  const profitValue = netProfit(profit);
  const units = clampSupply(supply);
  const percent = Number.isFinite(Number(poolPercent)) ? Number(poolPercent) : POOL_PERCENT;
  const pool = roundDown((profitValue * percent) / 100);
  if (!units || !pool) return { pool: 0, annual: 0, quarterly: 0 };
  const annual = roundDown(pool / units);
  return { pool, annual, quarterly: roundDown(annual / 4) };
}

/**
 * Same numbers plus the audit trail the UI prints under every figure:
 * formula as written in the brief, inputs used, and the rounding rule.
 */
export function explainShare(profit, supply = SUPPLY_LIMIT, poolPercent = POOL_PERCENT) {
  const share = calculateShare(profit, supply, poolPercent);
  return {
    ...share,
    profit: netProfit(profit),
    supply: clampSupply(supply),
    poolPercent: Number(poolPercent),
    formula: "dividend = (net profit × 25%) / 100",
    formulaQuarterly: "quarterly = ((net profit × 25%) / 100) / 4",
    rounding: "floor to 2 decimals",
    perNftPercent: Number(poolPercent) / clampSupply(supply),
    zeroReason:
      share.pool === 0
        ? "No net profit in the quarter — the dividend is $0, not a skipped payment."
        : null,
  };
}

/**
 * Fallback tier structure discussed in the brief when a single $1,000 class is
 * not used: Scout $500 ×100 (weight 1), Partner $1,000 ×40 (weight 2),
 * Anchor $2,000 ×5 (weight 3). Weights sum to 195.
 */
export const TIERED_FALLBACK = Object.freeze([
  Object.freeze({ id: "scout", price: 500, count: 100, weight: 1 }),
  Object.freeze({ id: "partner", price: 1000, count: 40, weight: 2 }),
  Object.freeze({ id: "anchor", price: 2000, count: 5, weight: 3 }),
]);

export const TIERED_WEIGHT_TOTAL = TIERED_FALLBACK.reduce(
  (total, tier) => total + tier.count * tier.weight,
  0
);

/**
 * Weighted variant of the same pool: one weight unit receives
 * `(profit × poolPercent%) / totalWeight`. Not an active offer — used only to
 * document the alternative in the Terms sheet.
 */
export function calculateTieredShare(profit, tiers = TIERED_FALLBACK, poolPercent = POOL_PERCENT) {
  const profitValue = netProfit(profit);
  const pool = roundDown((profitValue * poolPercent) / 100);
  const totalWeight = tiers.reduce(
    (total, tier) => total + Math.max(0, Math.floor(Number(tier.count) || 0)) * Math.max(0, Number(tier.weight) || 0),
    0
  );
  const perWeight = totalWeight && pool ? roundDown(pool / totalWeight) : 0;
  return {
    pool,
    totalWeight,
    perWeight,
    perWeightQuarterly: roundDown(perWeight / 4),
    tiers: tiers.map((tier) => ({
      id: tier.id,
      unit: perWeight * tier.weight,
      quarterly: roundDown((perWeight * tier.weight) / 4),
    })),
  };
}

/* ------------------------------------------------------------------ *
 * Payout calendar
 * ------------------------------------------------------------------ */

const SNAPSHOT_MONTHS = config.snapshot.months; // 1, 4, 7, 10

export function isWeekend(date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * First business day (UTC, Mon–Fri) of the given month.
 * Exchange holidays are deliberately NOT modelled yet: without an approved
 * calendar a guessed date would be an invented number. The shift rule for
 * holidays is an open operator question (see README, section F).
 */
export function firstBusinessDay(year, month) {
  const date = new Date(Date.UTC(year, month - 1, 1));
  while (isWeekend(date)) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

/** The four snapshot dates of a calendar year, in the brief's order. */
export function snapshotDates(year) {
  return SNAPSHOT_MONTHS.map((month) => ({
    year,
    month,
    date: firstBusinessDay(year, month),
  }));
}

/** Quarter (1–4) that a snapshot month closes. */
export const quarterForMonth = (month) => Math.ceil(month / 3);

/** Snapshot that governs a given date: the first one strictly after it. */
export function nextSnapshot(after = new Date()) {
  const year = after.getUTCFullYear();
  const candidates = [...snapshotDates(year), ...snapshotDates(year + 1)];
  return candidates.find((item) => item.date.getTime() > after.getTime()) || null;
}

export const isoDay = (date) => new Date(date).toISOString().slice(0, 10);

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

export function getLanguage(search, pathname = "") {
  const requested = new URLSearchParams(search).get("lang");
  if (requested) return requested === "en" ? "en" : "ru";
  return pathname.endsWith("/en.html") ? "en" : "ru";
}

/** USDC figures always keep `$` and English grouping, in both languages. */
export const money = (value, decimals = 0) =>
  "$" +
  Number(value).toLocaleString("en-US", { maximumFractionDigits: decimals });

/** A null metric is "unavailable", never "$0" — those mean different things. */
export const moneyOrDash = (value, decimals = 0) =>
  value === null || value === undefined || Number.isNaN(Number(value))
    ? "—"
    : money(value, decimals);

export const percent = (value, decimals = 2) =>
  value === null || value === undefined || Number.isNaN(Number(value))
    ? "—"
    : `${Number(value).toFixed(decimals)}%`;

/** UTC, because the hub reports in UTC and snapshots are UTC business days. */
export const stampUtc = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    ` ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
  );
};
