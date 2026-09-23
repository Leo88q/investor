/**
 * Registry of every number the landing is allowed to display.
 *
 * Nothing reaches the DOM without an entry here. Each entry carries:
 *   value    — the number (null for API-backed metrics, filled at runtime)
 *   source   — where it comes from (document path or hub endpoint)
 *   quality  — complete | partial | unavailable (mirrors the hub vocabulary)
 *   asOf     — when the value was last confirmed
 *   demo     — true only for values that come from the hub's mock read-model
 *
 * `origin` tells the linter how to treat the entry:
 *   config — operator deal parameter from src/config.js
 *   brief  — fact stated in the studio brief (hub: INVESTOR_LANDING_BRIEF.md)
 *   api    — read from the Games Watchtower API at runtime
 */

export const QUALITY = Object.freeze({
  COMPLETE: "complete",
  PARTIAL: "partial",
  UNAVAILABLE: "unavailable",
});

/** Date of the studio state this registry was reconciled against. */
export const BRIEF_AS_OF = "2026-09-23";

const BRIEF_SOURCE = "hub/INVESTOR_LANDING_BRIEF.md";
const HUB_REPORT = "hub/docs/FINAL_OS3_REPORT.md";

function fact(entry) {
  return Object.freeze({
    quality: QUALITY.PARTIAL,
    asOf: BRIEF_AS_OF,
    demo: false,
    ...entry,
  });
}

export const NUMBERS = Object.freeze({
  /* ---------------- deal parameters (src/config.js) ---------------- */
  price: fact({
    value: 1000,
    unit: "USDC",
    origin: "config",
    source: "src/config.js · price",
    note: "Working price, operator confirmation pending.",
  }),
  supply: fact({
    value: 100,
    unit: "NFT",
    origin: "config",
    source: "src/config.js · supply",
    note: "One-time drop; mint disables after close.",
  }),
  poolPercent: fact({
    value: 25,
    unit: "%",
    origin: "config",
    source: "src/config.js · poolPercent",
  }),
  walletLimit: fact({
    value: 10,
    unit: "NFT",
    origin: "config",
    source: "src/config.js · walletLimit",
    note: "Drop parameter to avoid concentration.",
  }),
  target: fact({
    value: 100000,
    unit: "USDC",
    origin: "config",
    source: "src/config.js · target",
  }),
  sharePerNft: fact({
    value: 0.25,
    unit: "%",
    origin: "config",
    source: "src/config.js · poolPercent / supply",
  }),

  /* ---------------- ecosystem facts from the brief ---------------- */
  games: fact({
    value: 4,
    unit: "games",
    origin: "brief",
    source: `${BRIEF_SOURCE} §0`,
    note: "ARES-1 beta, GUTTERCAPS alpha, Age of Farming and Neon Relay prototype.",
  }),
  channels: fact({
    value: 6,
    unit: "channels",
    origin: "brief",
    source: `${BRIEF_SOURCE} §0 (TalkChart)`,
    note: "SEO, GEO, X, video, whale radar, TipLink. Not an audience figure.",
  }),
  operatingSystems: fact({
    value: 1,
    unit: "OS",
    origin: "brief",
    source: `${BRIEF_SOURCE} §0 (Watchtower)`,
    quality: QUALITY.COMPLETE,
  }),
  campaigns: fact({
    value: 5,
    unit: "campaigns",
    origin: "brief",
    source: `${BRIEF_SOURCE} §0 (TalkChart)`,
  }),
  trafficSources: fact({
    value: 8,
    unit: "sources",
    origin: "brief",
    source: `${BRIEF_SOURCE} §0 (TalkChart)`,
  }),
  targetPages: fact({
    value: 6,
    unit: "pages",
    origin: "brief",
    source: `${BRIEF_SOURCE} §0 (TalkChart)`,
  }),
  adSpend: fact({
    value: 0,
    unit: "USDC",
    origin: "brief",
    source: `${BRIEF_SOURCE} §0 (TalkChart, no ad budget)`,
    quality: QUALITY.COMPLETE,
  }),
  snapshotMonths: fact({
    value: "1 / 4 / 7 / 10",
    origin: "brief",
    source: `${BRIEF_SOURCE} §1`,
    note: "First business day of January, April, July, October.",
  }),
  roadmapDates: fact({
    value: ["Q4 2026", "Q1 2027", "Q2 2027"],
    origin: "brief",
    source: `${BRIEF_SOURCE} §4 (plan, not a commitment)`,
    quality: QUALITY.PARTIAL,
    note: "Planned dates. A date is not a deliverable until the milestone is published.",
  }),
  scenarioMax: fact({
    value: 1000000,
    unit: "USDC",
    origin: "brief",
    source: `${BRIEF_SOURCE} §1 (calculator range)`,
    quality: QUALITY.PARTIAL,
  }),
  calcStep: fact({
    value: 1000,
    unit: "USDC",
    origin: "brief",
    source: `${BRIEF_SOURCE} §1 (calculator step)`,
    quality: QUALITY.PARTIAL,
  }),

  /* ---------------- use of funds / milestones ---------------- */
  funds: fact({
    value: [30000, 25000, 25000, 15000, 5000],
    unit: "USDC",
    origin: "brief",
    source: `${BRIEF_SOURCE} §2`,
  }),
  fundPercents: fact({
    value: [30, 25, 25, 15, 5],
    unit: "%",
    origin: "brief",
    source: `${BRIEF_SOURCE} §2`,
  }),
  milestoneSplit: fact({
    value: [50, 30, 20],
    unit: "%",
    origin: "brief",
    source: `${BRIEF_SOURCE} §2`,
    note: "Proposal, not an active mechanism.",
  }),

  /* ---------------- illustration scenarios (never a promise) ---------------- */
  scenarios: fact({
    value: [100000, 200000, 400000],
    unit: "USDC",
    origin: "brief",
    source: `${BRIEF_SOURCE} §1 (illustration, not a forecast)`,
  }),

  /**
   * Illustration figures quoted in the copy. They are the brief formula
   * applied to the $200,000 scenario above with the config supply — derived,
   * documented, and labelled "not a promise" wherever they are shown.
   */
  scenarioPool: fact({
    value: 50000,
    unit: "USDC",
    origin: "brief",
    source: `${BRIEF_SOURCE} §1 formula applied to the $200,000 scenario`,
    note: "Illustration only: 200,000 × 25% = 50,000.",
  }),
  scenarioPerNft: fact({
    value: 500,
    unit: "USDC",
    origin: "brief",
    source: `${BRIEF_SOURCE} §1 formula applied to the $200,000 scenario`,
    note: "Illustration only: 50,000 pool / 100 NFTs = 500 per NFT per year.",
  }),
  scenarioQuarterly: fact({
    value: 125,
    unit: "USDC",
    origin: "brief",
    source: `${BRIEF_SOURCE} §1 formula applied to the $200,000 scenario`,
    note: "Illustration only: 500 / 4 = 125 per quarter.",
  }),
  teamMonths: fact({
    value: "3–6",
    unit: "months",
    origin: "brief",
    source: `${BRIEF_SOURCE} §2 (team budget line)`,
  }),

  /* ---------------- studio state (hub report) ---------------- */
  configuredAdapters: fact({
    value: 0,
    unit: "of 5",
    origin: "brief",
    source: `${HUB_REPORT} · adapterReadiness`,
    quality: QUALITY.UNAVAILABLE,
    note: "Hub runs on mock data; no game adapter is configured yet.",
  }),
});

/**
 * Tokens resolved from the hub API at render time. They exist so copy can
 * reference live values without hard-coding digits.
 */
export const API_TOKENS = Object.freeze([
  "activePlayers",
  "newPlayers",
  "volume",
  "treasury",
  "minted",
  "burned",
  "criticalIncidents",
  "retentionD7",
  "payerConversion",
  "visitors",
  "pageViews",
  "ctaClicks",
  "landingReached",
  "botEvents",
  "realEvents",
  "adaptersConfigured",
  "adaptersTotal",
  "ecosystemLevel",
]);

const usd = (value) =>
  "$" +
  Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });

/** Human-readable rendering used by `fill()` when substituting tokens in copy. */
export function tokenValue(token) {
  const entry = NUMBERS[token];
  if (!entry) return null;
  if (Array.isArray(entry.value)) return entry.value.map(String).join(" / ");
  if (typeof entry.value !== "number") return String(entry.value);
  if (entry.unit === "USDC") return usd(entry.value);
  return String(entry.value);
}

/** Every declared token name, for the "no numbers without source" linter. */
export const ALL_TOKENS = Object.freeze([
  ...Object.keys(NUMBERS),
  ...API_TOKENS,
]);

export function describeSource(token) {
  const entry = NUMBERS[token];
  return entry ? entry.source : `GET ${token} (hub API)`;
}

export function metric(token) {
  const entry = NUMBERS[token];
  if (!entry) return null;
  return {
    id: token,
    value: entry.value,
    unit: entry.unit || "",
    quality: entry.quality,
    asOf: entry.asOf,
    demo: Boolean(entry.demo),
    source: entry.source,
    note: entry.note || "",
  };
}
