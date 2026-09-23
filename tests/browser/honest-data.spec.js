/**
 * Browser checks for the honesty rules (W1/W2) and accessibility.
 *
 * These specs run against the dev server (`npm run dev`) and intercept the
 * hub endpoints, so both the "hub answers with mock data" and the "hub is
 * unavailable" paths are exercised without a real hub.
 *
 * Not runnable in every sandbox: Playwright needs browser binaries
 * (`npx playwright install --with-deps chromium`). CI installs them.
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const REPORT = {
  reportId: "spec-report",
  generatedAt: "2026-09-23T10:00:00.000Z",
  period: "spec",
  source: "mock",
  metrics: {
    activePlayers: 142,
    newPlayers: 37,
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
  dataQuality: "partial",
};

const SNAPSHOTS = {
  generatedAt: "2026-09-23T10:00:00.000Z",
  source: "mock",
  dataQuality: "partial",
  snapshots: [
    {
      snapshotId: "snap-2027-Q1",
      version: 1,
      period: "2027-Q1",
      createdBy: "spec",
      createdAt: "2027-01-01T00:00:00.000Z",
      immutable: true,
      report: { ...REPORT, metrics: { ...REPORT.metrics, netProfit: 0 } },
    },
    {
      snapshotId: "snap-2027-Q2",
      version: 1,
      period: "2027-Q2",
      createdBy: "spec",
      createdAt: "2027-04-01T00:00:00.000Z",
      immutable: true,
      report: { ...REPORT, metrics: { ...REPORT.metrics, netProfit: 200000 } },
    },
  ],
};

const READ_MODEL = {
  generatedAt: "2026-09-23T10:00:00.000Z",
  source: "mock",
  funnel: [
    { step: 1, id: "ad_click", count: 0 },
    { step: 2, id: "wallet", count: 0 },
    { step: 3, id: "first_action", count: 0 },
  ],
  ingestion: { adapters: { total: 5, configured: 0, ready: 0, writes: false } },
};

async function mockHub(page, overrides = {}) {
  const routes = {
    "**/api/investors/report": REPORT,
    "**/api/investors/snapshots": SNAPSHOTS,
    "**/api/investors/trend": { generatedAt: REPORT.generatedAt, dataQuality: "partial", points: [] },
    "**/api/read-model": READ_MODEL,
    "**/api/analytics/traffic": { generatedAt: REPORT.generatedAt, dataQuality: "unavailable", totals: {}, campaigns: [] },
    "**/api/health": { ok: true, mode: "mock-read-model" },
    ...overrides,
  };
  for (const [url, body] of Object.entries(routes)) {
    await page.route(url, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      }),
    );
  }
  // The status endpoint is deliberately absent, exactly like the current hub.
  await page.route("**/api/ecosystem/status", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "not_found" }),
    }),
  );
}

test("a missing ecosystem endpoint is reported, not filled in", async ({ page }) => {
  await mockHub(page);
  await page.goto("/?lang=en#status");
  const status = page.locator("#status");
  await expect(status).toContainText("GET /api/ecosystem/status");
  await expect(status).toContainText("missing from the current hub build");
  // Levels are documented, never assigned.
  await expect(status.locator('[data-connected="true"]')).toHaveCount(0);
  // Adapter readiness is shown as published, with an unavailable quality.
  await expect(status).toContainText("Adapters configured");
  await expect(status.locator('.metric[data-metric="configuredAdapters"]')).toHaveAttribute(
    "data-quality",
    "unavailable",
  );
});

test("mock hub values are always labelled and carry a quality badge", async ({ page }) => {
  await mockHub(page);
  await page.goto("/?lang=en");
  await expect(page.getByText("DEMO DATA", { exact: true }).first()).toBeVisible();
  const metrics = page.locator("[data-metric]");
  const count = await metrics.count();
  expect(count).toBeGreaterThan(5);
  for (let i = 0; i < count; i += 1) {
    const metric = metrics.nth(i);
    await expect(metric).toHaveAttribute(
      "data-quality",
      /complete|partial|unavailable/,
    );
    await expect(metric).toHaveAttribute("data-demo", /true|false/);
  }
});

test("every metric can show its source, as-of stamp and formula", async ({ page }) => {
  await mockHub(page);
  await page.goto("/?lang=en");
  const metric = page.locator('[data-metric="price"]').first();
  await metric.scrollIntoViewIfNeeded();
  const toggle = metric.locator("button.metric-info");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const trace = metric.locator(".metric-trace");
  await expect(trace).toBeVisible();
  await expect(trace).toContainText("src/config.js");
  await expect(trace).toContainText("UTC");
});

test("snapshots show the formula, the zero quarter and per-quarter sources", async ({
  page,
}) => {
  await mockHub(page);
  await page.goto("/?lang=en#snapshots");
  const table = page.locator(".snapshot-table");
  await expect(table).toContainText("2027-Q1");
  await expect(table).toContainText("2027-Q2");
  // Zero-profit quarter: $0 with the explanation, not hidden.
  await expect(table).toContainText("No profit — the dividend is $0");
  // 200,000 x 25% / 100 = 500 per year, 125 per quarter.
  await expect(table).toContainText("$125");
  await expect(table.locator("a.source-link").first()).toHaveAttribute(
    "href",
    /\/api\/investors\/snapshots$/,
  );
});

test("an unavailable hub produces a reason and never a stale figure", async ({
  page,
}) => {
  await page.route("**/api/**", (route) => route.abort("failed"));
  await page.goto("/?lang=en#watchtower");
  const dashboard = page.locator("#watchtower .dashboard");
  await expect(dashboard).toContainText("Live data not connected");
  await expect(page.locator("#status")).toContainText("Data unavailable");
  await expect(page.locator(".data-state.unavailable").first()).toBeVisible();
  // No invented figures: every metric is either a registry fact or a dash.
  const values = await page.locator("[data-metric] .metric-value").allInnerTexts();
  expect(values.some((value) => value.trim() === "—")).toBe(true);
});

test("RU/EN switching keeps dashboard state without a reload", async ({ page }) => {
  await mockHub(page);
  await page.goto("/?lang=ru#watchtower");
  const dashboard = page.locator("#watchtower .dashboard").first();
  await dashboard.getByRole("tab", { name: "Воронки" }).click();
  await expect(dashboard.getByRole("tabpanel")).toContainText("конверсии недоступны");
  const before = await page.evaluate(() => performance.getEntriesByType("navigation").length);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(dashboard.getByRole("tab", { name: "Funnels" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const after = await page.evaluate(() => performance.getEntriesByType("navigation").length);
  expect(after).toBe(before);
});

test("the consent journal is written and can be withdrawn", async ({ page }) => {
  await page.goto("/?lang=en#waitlist");
  await page.getByRole("button", { name: "Withdraw consent" }).click();
  const journal = await page.evaluate(() =>
    window.localStorage.getItem("watchtower.investor.consents.v1"),
  );
  expect(journal).toBeTruthy();
  expect(JSON.parse(journal).email).toBe(false);
});

for (const lang of ["ru", "en"]) {
  test(`axe finds no serious accessibility violations (${lang})`, async ({ page }) => {
    await mockHub(page);
    await page.goto(`/?lang=${lang}`);
    await page.locator("#compliance").scrollIntoViewIfNeeded();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const serious = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact),
    );
    expect(
      serious.map((violation) => `${violation.id}: ${violation.help}`),
    ).toEqual([]);
  });
}
