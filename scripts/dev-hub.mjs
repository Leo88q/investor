/**
 * DEV FIXTURE — NOT A DATA SOURCE.
 *
 * Serves hub-shaped payloads on http://127.0.0.1:5174 so the landing can be
 * developed and demoed without the Games Watchtower server. Every payload is
 * marked `source: "mock"`, so the UI renders it behind a DEMO DATA badge — if
 * a payload here ever showed up unbranded, that would be a bug in the UI, not
 * a feature of this file.
 *
 * Never deploy this. Never point production at it. The real hub lives in
 * Leo88q/Games-watchtower (read-only for this repo).
 *
 *   node scripts/dev-hub.mjs        # then: npm run dev (proxies /api here)
 */

import { createServer } from "node:http";

const PORT = Number(process.env.DEV_HUB_PORT || 5174);
const startedAt = new Date().toISOString();

const report = {
  reportId: "dev-fixture-report",
  generatedAt: startedAt,
  period: "dev fixture",
  source: "mock",
  metrics: {
    activePlayers: 142,
    newPlayers: 37,
    retentionD7: 0.21,
    payerConversion: 0.031,
    volume: 18450,
    treasury: 25100,
    minted: 96,
    burned: 4,
    criticalIncidents: 0,
    dataQuality: "partial",
  },
  games: [
    { id: "ares1", name: "ARES-1", players: 96, volume: 12100, healthScore: 61, dataQuality: "partial" },
    { id: "aof", name: "Age of Farming", players: 0, volume: 0, healthScore: 0, dataQuality: "unavailable" },
    { id: "neonrelay", name: "Neon Relay", players: 31, volume: 4100, healthScore: 44, dataQuality: "partial" },
    { id: "guttercaps", name: "GUTTERCAPS", players: 15, volume: 2250, healthScore: 38, dataQuality: "partial" },
  ],
  narrative: "Dev fixture. Not a studio report.",
  privacy: { pseudoanonymized: true },
  confidence: 0.5,
};

const snapshots = {
  generatedAt: startedAt,
  source: "mock",
  dataQuality: "partial",
  snapshots: [
    {
      snapshotId: "snap-2027-Q1",
      version: 1,
      period: "2027-Q1",
      createdBy: "dev-fixture",
      createdAt: "2027-01-01T00:00:00.000Z",
      immutable: true,
      report: { ...report, metrics: { ...report.metrics, netProfit: 0 } },
    },
    {
      snapshotId: "snap-2027-Q2",
      version: 1,
      period: "2027-Q2",
      createdBy: "dev-fixture",
      createdAt: "2027-04-01T00:00:00.000Z",
      immutable: true,
      report: { ...report, metrics: { ...report.metrics, netProfit: 200000 } },
    },
  ],
};

const trend = {
  generatedAt: startedAt,
  source: "mock",
  dataQuality: "partial",
  points: [
    { snapshotId: "snap-2027-Q1", createdAt: "2027-01-01T00:00:00.000Z", period: "2027-Q1", activePlayers: 120, volume: 15000, minted: 90, burned: 2, criticalIncidents: 0, confidence: 0.4 },
    { snapshotId: "snap-2027-Q2", createdAt: "2027-04-01T00:00:00.000Z", period: "2027-Q2", activePlayers: 142, volume: 18450, minted: 96, burned: 4, criticalIncidents: 0, confidence: 0.5 },
  ],
};

const readModel = {
  generatedAt: startedAt,
  source: "mock",
  overview: {},
  funnel: [
    { step: 1, id: "ad_click", count: 0 },
    { step: 2, id: "wallet", count: 0 },
    { step: 3, id: "first_action", count: 0 },
  ],
  ingestion: {
    inboxStatus: "mock",
    adapters: {
      total: 5,
      configured: 0,
      ready: 0,
      writes: false,
      adapters: [{ id: "trafficgen", configured: false, quality: "unavailable" }],
    },
  },
};

const traffic = {
  generatedAt: startedAt,
  source: "mock",
  dataQuality: "partial",
  totals: { events: 0, pageViews: 0, sessions: 0, ctaClicks: 0, visitors: 0 },
  funnel: [],
  campaigns: [],
  unavailableMetrics: [
    { metric: "LandingReached conversion", reason: "no confirmation mechanism", estimate: false },
  ],
  reason: "Dev fixture: no events ingested.",
};

const routes = {
  "/api/investors/report": report,
  "/api/investors/snapshots": snapshots,
  "/api/investors/trend": trend,
  "/api/read-model": readModel,
  "/api/analytics/traffic": traffic,
  "/api/health": { ok: true, mode: "dev-fixture", writes: false },
};

createServer((req, res) => {
  const path = String(req.url || "").split("?")[0];
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("cache-control", "no-store");
  if (routes[path]) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(routes[path], null, 2));
    return;
  }
  // /api/ecosystem/status is deliberately absent: the real hub does not serve
  // it yet, and the development fixture must not pretend otherwise.
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found", path, fixture: true }));
}).listen(PORT, "127.0.0.1", () => {
  console.log(`DEV FIXTURE (mock data) on http://127.0.0.1:${PORT}`);
  console.log("Serves: " + Object.keys(routes).join(", "));
  console.log("Missing on purpose: /api/ecosystem/status");
});
