/**
 * Single place for every deal parameter and integration endpoint.
 *
 * Rule: a number that appears on the page is either (a) read from the hub API
 * with a source + dataQuality + asOf, or (b) declared here / in `numbers.js`
 * with an explicit source. Nothing else is allowed to reach the DOM.
 *
 * All VITE_* values are public by definition (they ship in the bundle):
 * no secrets, no mint keys, no read tokens belong in this file.
 */

/**
 * `import.meta.env` exists under Vite; the node test runner and any SSR pass
 * see `undefined`. Falling back to an empty object keeps this module importable
 * from `tests/*.test.js` without a bundler.
 */
const env = (import.meta && import.meta.env) || {};
const httpsUrl = (value) => (/^https:\/\//.test(value) ? value : "");
const path = (value) => (/^\/(?!\/)/.test(value) ? value : "");

export const config = Object.freeze({
  /* ---- deal parameters (operator-confirmed working values) ---- */
  price: 1000,
  supply: 100,
  poolPercent: 25,
  walletLimit: 10,
  target: 100000,
  dividendToken: "USDC",
  network: "Solana",

  /* ---- payout calendar ---- */
  snapshot: Object.freeze({
    months: Object.freeze([1, 4, 7, 10]),
    rule: "first_business_day",
    timezone: "UTC",
  }),

  /* ---- sale gates: closed until every gate below is true ---- */
  saleOpen: env.VITE_SALE_OPEN === "true",
  marketplaceUrl: httpsUrl(env.VITE_MARKETPLACE_URL || ""),
  formEndpoint: path(env.VITE_FORM_ENDPOINT || ""),
  contactUrl: httpsUrl(env.VITE_CONTACT_URL || ""),
  termsUrl: httpsUrl(env.VITE_TERMS_URL || ""),
  siteUrl: httpsUrl(env.VITE_SITE_URL || ""),

  /* ---- mint transparency: published only after operator confirmation ---- */
  mint: Object.freeze({
    status: "in_progress",
    programAddress: "",
    addressPublished: false,
    supply: 100,
    multisig: "",
    multisigPublished: false,
    auditUrl: "",
  }),

  /* ---- compliance ---- */
  legal: Object.freeze({
    termsStatus: "draft",
    kycProvider: "",
    kycStatus: "pending",
    restrictedJurisdictions: Object.freeze([]),
    restrictedJurisdictionsPublished: false,
    taxWithholdingNote: "pending",
  }),

  /* ---- hub API (Games Watchtower, read-only) ---- */
  api: Object.freeze({
    base: (env.VITE_API_BASE || "/api").replace(/\/+$/, ""),
    timeoutMs: Number(env.VITE_API_TIMEOUT_MS || 8000),
    endpoints: Object.freeze({
      report: "/investors/report",
      snapshots: "/investors/snapshots",
      trend: "/investors/trend",
      ecosystemStatus: "/ecosystem/status",
      readModel: "/read-model",
      traffic: "/analytics/traffic",
      health: "/health",
    }),
  }),

  /* ---- lead / consent contract ---- */
  lead: Object.freeze({
    contractVersion: "investor-lead-v1",
    consentStorageKey: "watchtower.investor.consents.v1",
    consentServiceEndpoint: path(env.VITE_CONSENT_ENDPOINT || ""),
    minimumSubmitSeconds: 2,
    resubmitCooldownSeconds: 30,
  }),

  /* ---- operational posture published to investors ---- */
  ops: Object.freeze({
    slo: Object.freeze({
      uptimeTarget: 99.9,
      apiP95TargetMs: 300,
      statusPageUrl: "",
    }),
    contentBackup: "in_progress",
    sbom: "in_progress",
    releaseRunbook: "in_progress",
    snapshotPublication: "operator_confirmed",
  }),
});

/** The sale is live only when the marketplace, the Terms and the flag agree. */
export const saleReady =
  config.saleOpen &&
  Boolean(config.marketplaceUrl) &&
  Boolean(config.termsUrl);

/** 100 NFTs x 0.25% = 25% of net profit. Derived, never hard-coded in copy. */
export const sharePerNft =
  Math.round((config.poolPercent / config.supply) * 10000) / 10000;
