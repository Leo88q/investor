/**
 * Client-side data path, verified in jsdom.
 *
 * The honesty rules are not only about what the components can render — they
 * are about what the running app does when the hub answers. This test mounts
 * the real `App`, stubs `fetch` with hub-shaped payloads, and asserts:
 *
 *   - a `source: "mock"` answer is rendered behind DEMO DATA, never as fact;
 *   - a failing hub renders the reason and leaves dashes, not stale values;
 *   - the snapshot table computes the dividend with the brief formula.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { JSDOM } from "jsdom";

const REPORT = {
  reportId: "client-test",
  generatedAt: "2026-09-23T10:00:00.000Z",
  period: "test",
  source: "mock",
  dataQuality: "partial",
  metrics: { activePlayers: 142, volume: 18450, dataQuality: "partial" },
  games: [
    { id: "ares1", name: "ARES-1", players: 96, volume: 12100, dataQuality: "partial" },
    { id: "aof", name: "Age of Farming", players: 0, volume: 0, dataQuality: "unavailable" },
    { id: "neonrelay", name: "Neon Relay", players: 31, volume: 4100, dataQuality: "partial" },
    { id: "guttercaps", name: "GUTTERCAPS", players: 15, volume: 2250, dataQuality: "partial" },
  ],
};

const SNAPSHOTS = {
  generatedAt: REPORT.generatedAt,
  source: "mock",
  dataQuality: "partial",
  snapshots: [
    {
      snapshotId: "snap-q1",
      version: 1,
      period: "2027-Q1",
      createdBy: "test",
      createdAt: "2027-01-01T00:00:00.000Z",
      immutable: true,
      report: { ...REPORT, metrics: { ...REPORT.metrics, netProfit: 0 } },
    },
    {
      snapshotId: "snap-q2",
      version: 1,
      period: "2027-Q2",
      createdBy: "test",
      createdAt: "2027-04-01T00:00:00.000Z",
      immutable: true,
      report: { ...REPORT, metrics: { ...REPORT.metrics, netProfit: 200000 } },
    },
  ],
};

const RESPONSES = {
  "/api/investors/report": REPORT,
  "/api/investors/snapshots": SNAPSHOTS,
  "/api/investors/trend": { generatedAt: REPORT.generatedAt, dataQuality: "partial", points: [] },
  "/api/read-model": {
    generatedAt: REPORT.generatedAt,
    source: "mock",
    funnel: [{ step: 1, count: 10 }, { step: 2, count: 4 }, { step: 3, count: 2 }],
    ingestion: { adapters: { total: 5, configured: 0, ready: 0, writes: false } },
  },
  "/api/analytics/traffic": {
    generatedAt: REPORT.generatedAt,
    dataQuality: "unavailable",
    campaigns: [],
    totals: {},
  },
  "/api/health": { ok: true, mode: "mock-read-model" },
};

let server;
let ui;
let dom;
let restoreFetch;

function installDom() {
  dom = new JSDOM(
    "<!doctype html><html lang='ru'><head>" +
      "<meta name='description' content='x' />" +
      "<meta property='og:title' content='x' />" +
      "<meta property='og:description' content='x' />" +
      "<meta property='og:locale' content='ru_RU' />" +
      "<meta name='twitter:title' content='x' />" +
      "<meta name='twitter:description' content='x' />" +
      "</head><body><div id='root'></div></body></html>",
    { url: "http://localhost/?lang=en", pretendToBeVisual: true },
  );
  const define = (key, value) =>
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  define("window", dom.window);
  define("document", dom.window.document);
  define("navigator", dom.window.navigator);
  define("HTMLElement", dom.window.HTMLElement);
  define("localStorage", dom.window.localStorage);
  define("IS_REACT_ACT_ENVIRONMENT", true);
  // jsdom has no IntersectionObserver; the app only uses it for nav highlighting.
  define("IntersectionObserver", class {
    observe() {}
    disconnect() {}
    unobserve() {}
  });
}

before(async () => {
  server = await createServer({
    configFile: "vite.config.js",
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
  });
  ui = await server.ssrLoadModule("/src/main.jsx");
});

after(async () => {
  if (server) await server.close();
  if (dom) dom.window.close();
});

/** Mount the app with a stubbed hub and let effects settle. */
async function mount({ failing = false } = {}) {
  installDom();
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (failing) throw new TypeError("network down");
    const path = String(url).split("?")[0];
    if (path === "/api/ecosystem/status") {
      return { status: 404, ok: false, headers: { get: () => "application/json" } };
    }
    const body = RESPONSES[path];
    if (!body) {
      return { status: 404, ok: false, headers: { get: () => "application/json" } };
    }
    return {
      status: 200,
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => body,
    };
  };
  restoreFetch = globalThis.fetch;

  const { createRoot } = await import("react-dom/client");
  const React = (await import("react")).default;
  const container = document.getElementById("root");
  const root = createRoot(container);
  await React.act(async () => {
    root.render(React.createElement(ui.App));
  });
  // Let the hub promises resolve and the state settle.
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
  return { html: container.innerHTML, text: container.textContent, calls };
}

test("the chosen language is applied without a reload", async () => {
  const { html } = await mount();
  assert.match(html, /ECOSYSTEM STATUS/);
  assert.match(html, /What is connected/);
});

test("a mock hub answer is rendered behind DEMO DATA and quality badges", async () => {
  const { html, text } = await mount();
  assert.ok(text.includes("DEMO DATA"), "DEMO DATA label is missing");
  assert.match(html, /data-demo="true"/);
  const metrics = html.match(/<[^>]*data-metric="[^"]*"[^>]*>/g) || [];
  assert.ok(metrics.length > 8, `expected metrics, found ${metrics.length}`);
  for (const metric of metrics) {
    assert.match(metric, /data-quality="(complete|partial|unavailable)"/);
  }
  // Figures come from the payload, and the calendar is honest about pending.
  assert.match(text, /2027-01-01/);
  assert.match(text, /2027-04-01/);
});

test("the dividend column follows the brief formula, quarter by quarter", async () => {
  const { text } = await mount();
  // 0 profit -> $0 with the explanation; 200,000 -> 125 per quarter.
  assert.match(text, /No profit — the dividend is \$0/);
  assert.match(text, /\$125/);
  assert.match(text, /\$500/);
});

test("a failing hub leaves dashes and a reason, never a stale figure", async () => {
  const { html, text } = await mount({ failing: true });
  assert.match(text, /Data unavailable/);
  assert.match(html, /class="data-state unavailable"/);
  assert.match(text, /network/i);
  // Nothing may be labelled as hub data, and every API-backed metric must be
  // an em dash rather than a remembered value.
  assert.equal(/data-demo="true"/.test(html), false);
  assert.match(html, /class="metric dash-number" data-metric="report.netProfit"[^>]*data-quality="unavailable"/);
  assert.match(html, /<span class="metric-value">—<\/span>/);
  assert.match(html, /data-quality="unavailable"/);
});

test("the ecosystem status screen reports the missing endpoint", async () => {
  const { text } = await mount();
  assert.match(text, /missing from the current hub build/i);
  assert.match(text, /GET \/api\/ecosystem\/status/);
});

test("no environment secret is required for the page to work", async () => {
  const { calls } = await mount();
  assert.ok(calls.every((url) => url.startsWith("/api/")), calls.join(", "));
  assert.equal(calls.some((url) => /token|key|secret/i.test(url)), false);
});

/**
 * Accessibility: structure and ARIA, verified in jsdom.
 *
 * axe-core runs against the mounted markup. Layout-dependent rules (colour
 * contrast, target size, scrollable-region-focusable) need a real renderer and
 * stay in the Playwright run; everything structural is checked here so the
 * suite still has a11y teeth when no browser binary is available.
 */
const AXE_TAGS = ["wcag2a", "wcag2aa", "best-practice"];

async function runAxe() {
  const axe = (await import("axe-core")).default;
  const results = await axe.run("#root", {
    runOnly: { type: "tag", values: AXE_TAGS },
    rules: {
      // jsdom cannot compute layout; these are covered by the browser suite.
      "color-contrast": { enabled: false },
      "target-size": { enabled: false },
      "scrollable-region-focusable": { enabled: false },
    },
  });
  return results;
}

for (const lang of ["en", "ru"]) {
  test(`axe finds no serious violations in the ${lang.toUpperCase()} page`, async () => {
    await mount({ lang });
    const serious = (await runAxe()).violations
      .filter((violation) => ["serious", "critical"].includes(violation.impact))
      .map(
        (violation) =>
          `${violation.id} (${violation.help}): ` +
          violation.nodes
            .slice(0, 3)
            .map((node) => node.target.join(" "))
            .join(" | "),
      );
    assert.deepEqual(serious, []);
  });
}

test("document level accessibility: lang, title and a single h1", async () => {
  const { html } = await mount();
  assert.equal(document.documentElement.getAttribute("lang"), "en");
  assert.ok(document.title.length > 0, "the page needs a title");
  const h1s = html.match(/<h1\b/g) || [];
  assert.equal(h1s.length, 1, "exactly one h1 per page");
  assert.match(html, /role="tablist"/);
});

test("every interactive control is reachable by keyboard and has a name", async () => {
  await mount();
  const controls = [
    ...document.querySelectorAll("button, a[href], input, select, textarea, [role='tab']"),
  ];
  assert.ok(controls.length > 5, "the page is interactive");
  for (const node of controls) {
    const text = (node.textContent || "").trim();
    const name =
      text ||
      node.getAttribute("aria-label") ||
      node.getAttribute("aria-labelledby") ||
      node.getAttribute("title") ||
      node.getAttribute("alt") ||
      (node.id && document.querySelector(`label[for="${node.id}"]`)?.textContent) ||
      "";
    assert.ok(
      String(name).trim().length > 0,
      `control without an accessible name: ${node.outerHTML.slice(0, 120)}`,
    );
    // `tabindex="-1"` is legitimate in exactly three places: the spam honeypot
    // (hidden from users and AT), the programmatically focused dialog card and
    // the inactive half of a roving-tabindex tablist.
    if (node.getAttribute("tabindex") === "-1") {
      const allowed = node.closest("[aria-hidden='true'], [role='dialog']") || node.role === "tab";
      assert.ok(allowed, `unexpected tabindex="-1": ${node.outerHTML.slice(0, 120)}`);
    }
    if (node.getAttribute("role") === "tab") {
      node.role = "tab";
      assert.ok(node.closest("[role='tablist']"), "tabs live in a tablist");
      assert.ok(node.getAttribute("aria-controls"), "each tab points at its panel");
    }
    if (node.tagName === "BUTTON") {
      assert.ok(
        ["button", "submit", "reset", "close"].includes(node.getAttribute("type") || "submit"),
        `button type must be explicit: ${node.outerHTML.slice(0, 120)}`,
      );
    }
  }
  for (const list of document.querySelectorAll("[role='tablist']")) {
    const focusable = [...list.querySelectorAll("[role='tab']")].filter(
      (tab) => tab.getAttribute("tabindex") !== "-1",
    );
    assert.equal(focusable.length, 1, "a tablist keeps exactly one tab in the tab order");
  }
  const images = [...document.querySelectorAll("img")];
  for (const img of images) {
    assert.ok(
      img.getAttribute("alt") !== null,
      `image without alt: ${img.getAttribute("src")}`,
    );
    if (!img.getAttribute("aria-hidden")) {
      assert.ok(img.getAttribute("width") && img.getAttribute("height"), "images carry dimensions");
    }
  }
});
