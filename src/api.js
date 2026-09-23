/**
 * Read-only client for the Games Watchtower hub API.
 *
 * Contract with the UI (the honesty rule, enforced in one place):
 *   - a request either succeeds and is labelled with its real source,
 *     dataQuality and asOf, or it fails and the UI renders an explicit
 *     "unavailable" state with the reason;
 *   - hub responses whose `source` is `mock` are demo data. They are still
 *     shown (the studio genuinely runs on mock) but always behind a
 *     DEMO DATA badge and never presented as live;
 *   - nothing here invents, interpolates or carries over a stale value.
 */

import { config } from "./config.js";
import { QUALITY } from "./numbers.js";

/** Endpoint -> human label + doc anchor used in every traceability tooltip. */
const ENDPOINTS = config.api.endpoints;

export const SOURCE_LABEL = Object.freeze({
  report: "GET /api/investors/report",
  snapshots: "GET /api/investors/snapshots",
  trend: "GET /api/investors/trend",
  ecosystemStatus: "GET /api/ecosystem/status",
  readModel: "GET /api/read-model",
  traffic: "GET /api/analytics/traffic",
  health: "GET /api/health",
});

const QUALITY_VALUES = new Set([QUALITY.COMPLETE, QUALITY.PARTIAL, QUALITY.UNAVAILABLE]);

export function normalizeQuality(value, fallback = QUALITY.UNAVAILABLE) {
  const normalized = String(value || "").toLowerCase();
  return QUALITY_VALUES.has(normalized) ? normalized : fallback;
}

/** One failed request must never break the page: every call resolves. */
export async function fetchJson(key, { signal } = {}) {
  const path = ENDPOINTS[key];
  const label = SOURCE_LABEL[key] || key;
  if (!path) return { status: "unavailable", reason: "unknown_endpoint", label };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.api.timeoutMs);
  const onAbort = () => controller.abort();
  if (signal) signal.addEventListener("abort", onAbort, { once: true });

  try {
    const response = await fetch(`${config.api.base}${path}`, {
      method: "GET",
      headers: { accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
    });

    if (response.status === 404) {
      return {
        status: "unavailable",
        reason: "endpoint_not_deployed",
        httpStatus: 404,
        label,
      };
    }
    if (!response.ok) {
      return {
        status: "unavailable",
        reason: "http_error",
        httpStatus: response.status,
        label,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json")) {
      // A static host answering with index.html must not look like data.
      return { status: "unavailable", reason: "not_json", label };
    }

    const data = await response.json();
    return { status: "ok", data, label };
  } catch (error) {
    const aborted =
      error && (error.name === "AbortError" || /abort/i.test(String(error.message)));
    return {
      status: "unavailable",
      reason: aborted ? "timeout" : "network_error",
      label,
    };
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

/** Hub `source: 'mock'` (or an explicit demo flag) is demo data. */
export function isDemo(payload) {
  if (!payload || typeof payload !== "object") return false;
  return payload.source === "mock" || payload.demo === true;
}

/**
 * Normalize a hub payload into the metric records the UI renders.
 * `values` maps a metric id to the raw hub field; a null result stays null so
 * the row renders as unavailable instead of showing a guessed number.
 */
export function buildMetrics(payload, values, { sourceLabel, asOf } = {}) {
  const quality = normalizeQuality(payload && payload.dataQuality, QUALITY.PARTIAL);
  const demo = isDemo(payload);
  const stamp =
    asOf ||
    (payload && (payload.generatedAt || payload.createdAt || payload.at)) ||
    null;

  return Object.fromEntries(
    Object.entries(values).map(([id, field]) => {
      const raw = typeof field === "function" ? field(payload) : payload && payload[field];
      const value = raw === null || raw === undefined || Number.isNaN(raw) ? null : raw;
      return [
        id,
        {
          id,
          value,
          quality: value === null ? QUALITY.UNAVAILABLE : quality,
          asOf: stamp,
          demo,
          source: sourceLabel,
        },
      ];
    })
  );
}

/* ------------------------------------------------------------------ *
 * Endpoint loaders
 * ------------------------------------------------------------------ */

export const loadHealth = () => fetchJson("health");

export const loadReport = () => fetchJson("report");

export const loadSnapshots = () => fetchJson("snapshots");

export const loadTrend = () => fetchJson("trend");

/**
 * `/api/ecosystem/status` is not routed in the current hub build. Until it is,
 * this resolves to `endpoint_not_deployed` and the studio-status screen must
 * say so. L0–L4 levels are never inferred from other endpoints.
 */
export const loadEcosystemStatus = () => fetchJson("ecosystemStatus");

/**
 * Interlock i-09 (acquisition: ad click -> wallet -> first action) reads the
 * funnel from the read model; i-08 (landing conversion) reads traffic.
 */
export async function loadReadModel() {
  const result = await fetchJson("readModel");
  if (result.status !== "ok") return result;
  const model = result.data || {};
  return {
    ...result,
    funnel: model.funnel || null,
    ingestion: model.ingestion || null,
    traffic: model.traffic || null,
    investor: model.investor || null,
    controls: model.controls || null,
  };
}

export async function loadTraffic() {
  const result = await fetchJson("traffic");
  if (result.status !== "ok") return result;
  const payload = result.data || {};
  return {
    ...result,
    totals: payload.totals || null,
    funnel: payload.funnel || null,
    trafficType: payload.trafficType || null,
    campaigns: payload.campaigns || null,
    unavailableMetrics: payload.unavailableMetrics || null,
    reasonText: payload.reason || null,
  };
}

/** Parallel fetch used by the dashboard; failures degrade individually. */
export async function loadDashboardData({ signal } = {}) {
  const [report, snapshots, trend, ecosystem, traffic, health, readModel] =
    await Promise.all([
      fetchJson("report", { signal }),
      fetchJson("snapshots", { signal }),
      fetchJson("trend", { signal }),
      fetchJson("ecosystemStatus", { signal }),
      fetchJson("traffic", { signal }),
      fetchJson("health", { signal }),
      fetchJson("readModel", { signal }),
    ]);

  return { report, snapshots, trend, ecosystem, traffic, health, readModel };
}

/**
 * Adapter readiness as published by the hub. This is the only ecosystem-status
 * figure available today, so it is surfaced with its own quality and demo flag.
 */
export function adapterInventory(readModel) {
  if (!readModel || readModel.status !== "ok") return null;
  const ingestion = readModel.data && readModel.data.ingestion;
  const readiness = ingestion && ingestion.adapters;
  if (!readiness || typeof readiness !== "object") return null;
  return {
    configured: Number(readiness.configured) || 0,
    total: Number(readiness.total) || 0,
    ready: Number(readiness.ready) || 0,
    writes: readiness.writes === true,
    demo: isDemo(readModel.data) || isDemo(ingestion),
    asOf: readModel.data.generatedAt || null,
    source: `${SOURCE_LABEL.readModel} · ingestion.adapters`,
  };
}

/* ------------------------------------------------------------------ *
 * Payload adapters.
 *
 * The landing accepts exactly the hub's documented shapes. Anything else is
 * reported as unavailable instead of being guessed at, and fields the hub
 * does not publish yet stay `null` so the UI prints an em dash.
 * ------------------------------------------------------------------ */

/**
 * `/api/ecosystem/status` is not implemented in the current hub build.
 * When it lands it must answer with:
 *   { generatedAt, source, dataQuality,
 *     levels: [{ id: "L0", definition }],
 *     games:  [{ id, name, stage, level, connected: [id], disconnected: [{ id, reason }] }],
 *     apps:   [{ id, name, level, connected: boolean, reason }] }
 * The normalizer below is written against that schema and returns null for
 * anything that does not qualify, so a partial answer can never be mistaken
 * for a full one.
 */
export function normalizeEcosystemStatus(payload) {
  if (!payload || typeof payload !== "object") return null;
  const games = Array.isArray(payload.games) ? payload.games : null;
  const levels = Array.isArray(payload.levels) ? payload.levels : null;
  if (!games && !levels && !Array.isArray(payload.apps)) return null;

  const clean = (list) =>
    (list || [])
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: String(item.id || item.name || ""),
        name: item.name || item.id || "",
        stage: item.stage || "",
        level: item.level || item.status || "",
        notes: item.notes || item.note || "",
        connected: Array.isArray(item.connected) ? item.connected.map(String) : [],
        disconnected: Array.isArray(item.disconnected)
          ? item.disconnected.map((entry) =>
              typeof entry === "string" ? { id: entry, reason: "" } : { id: String(entry.id || entry.name || ""), reason: entry.reason || "" }
            )
          : [],
        connectedFlag: typeof item.connected === "boolean" ? item.connected : null,
      }));

  return {
    asOf: payload.generatedAt || payload.asOf || null,
    demo: isDemo(payload),
    quality: normalizeQuality(payload.dataQuality, QUALITY.PARTIAL),
    levels: (levels || []).map((item) => ({
      id: String(item.id || item.level || ""),
      definition: item.definition || item.description || "",
    })),
    games: clean(games),
    apps: clean(payload.apps),
  };
}

/**
 * Net profit for a snapshot quarter. The hub report does not publish this
 * field yet; when it does, this resolves it and everything else shows "—".
 * A zero is a real answer and must survive: it means a $0 dividend.
 */
const PROFIT_FIELDS = ["netProfit", "profit", "net_profit"];

export function snapshotProfit(report) {
  if (!report || typeof report !== "object") return null;
  const buckets = [report, report.metrics, report.summary];
  for (const bucket of buckets) {
    if (!bucket || typeof bucket !== "object") continue;
    for (const field of PROFIT_FIELDS) {
      const raw = bucket[field];
      const value =
        raw && typeof raw === "object" && "value" in raw ? raw.value : raw;
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
  }
  return null;
}

/** Snapshot rows, normalized for the table; never sorted by invention. */
export function normalizeSnapshots(payload) {
  const list = payload && Array.isArray(payload.snapshots) ? payload.snapshots : null;
  if (!list) return [];
  return list.map((entry) => ({
    id: entry.snapshotId || entry.id || "",
    version: entry.version || "",
    period: entry.period || "",
    createdBy: entry.createdBy || "",
    createdAt: entry.createdAt || entry.asOf || null,
    immutable: entry.immutable === true,
    profit: snapshotProfit(entry.report),
    quality: normalizeQuality(
      entry.report && entry.report.metrics && entry.report.metrics.dataQuality,
      QUALITY.PARTIAL
    ),
    demo: isDemo(entry) || isDemo(entry.report),
    href: `${config.api.base}${ENDPOINTS.snapshots}`,
  }));
}

/* ------------------------------------------------------------------ *
 * Lead / consent contract (interlock i-02)
 * ------------------------------------------------------------------ */

export const CONSENT_VERSION = config.lead.contractVersion;

/**
 * Payload shape is frozen: tests/browser/form.spec.js asserts the legacy
 * four keys are still present and unchanged.
 */
export function buildLeadPayload({ email, language, consents, campaign }) {
  return {
    email,
    language,
    source: "watchtower-investor",
    consents: { ...consents, termsVersion: CONSENT_VERSION },
    ...(campaign ? { campaign } : {}),
  };
}

export function readConsents(storage = globalThis.localStorage) {
  try {
    const raw = storage && storage.getItem(config.lead.consentStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Consent/opt-out journal, mirrored to the studio consent service when set. */
export function writeConsents(record, storage = globalThis.localStorage) {
  const entry = {
    contractVersion: CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
    ...record,
  };
  try {
    if (storage) storage.setItem(config.lead.consentStorageKey, JSON.stringify(entry));
  } catch {
    /* storage may be unavailable (private mode) — the page still works */
  }
  if (config.lead.consentServiceEndpoint) {
    const body = JSON.stringify(entry);
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          config.lead.consentServiceEndpoint,
          new Blob([body], { type: "application/json" })
        );
      }
    } catch {
      /* opt-out sync is best effort; it never blocks the UI */
    }
  }
  return entry;
}
