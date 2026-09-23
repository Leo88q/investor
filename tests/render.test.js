/**
 * Server-render smoke tests.
 *
 * Playwright needs browser binaries that CI provides, but the honesty rules
 * must be verifiable without a browser too. These tests load the real
 * `src/main.jsx` through Vite's SSR module loader and render the components
 * with fixture payloads, asserting the invariant that matters most:
 *
 *   every rendered figure carries a dataQuality badge, and a missing value
 *   renders as an em dash instead of a substituted number.
 */

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { content } from "../src/content.js";

let server;
let ui;

before(async () => {
  // Minimal browser surface: components read `window.location` at render time.
  globalThis.window = {
    location: { search: "", pathname: "/", href: "http://localhost/" },
    addEventListener() {},
    removeEventListener() {},
    history: { pushState() {} },
  };
  if (!globalThis.navigator) {
    Object.defineProperty(globalThis, "navigator", {
      value: { userAgent: "node" },
      configurable: true,
    });
  }
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
});

const render = (element) => renderToStaticMarkup(element);
const h = React.createElement;

test("the whole landing renders without inventing a value", () => {
  const html = render(h(ui.App));
  // No placeholder leaks into the markup.
  assert.equal(/undefined|NaN|\[object Object\]/.test(html), false);
  // The three new screens and their anchors exist.
  for (const id of ["status", "snapshots", "compliance"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  // The module never claims a number it cannot source.
  assert.match(html, /GET \/api\/ecosystem\/status/);
  assert.match(html, /GET \/api\/investors\/snapshots/);
});

test("every rendered metric carries a quality badge", () => {
  const html = render(h(ui.App));
  const tags = html.match(/<[^>]*data-metric="[^"]*"[^>]*>/g) || [];
  assert.ok(tags.length >= 6, `expected metrics in the markup, got ${tags.length}`);
  for (const tag of tags) {
    assert.match(
      tag,
      /data-quality="(complete|partial|unavailable)"/,
      `metric without a quality badge: ${tag}`,
    );
    assert.match(tag, /data-demo="(true|false)"/);
  }
});

test("a null value renders as an em dash, never as a substituted figure", () => {
  const t = content.en;
  const html = render(
    h(ui.Metric, {
      token: "net profit",
      t,
      metric: {
        id: "report.netProfit",
        value: null,
        quality: "partial",
        asOf: null,
        demo: false,
        source: "GET /api/investors/report",
      },
    }),
  );
  assert.match(html, /—/);
  assert.match(html, /data-quality="unavailable"/);
  assert.equal(/\d/.test(html.replace(/<[^>]*>/g, "")), false);
});

test("mock payloads are always labelled DEMO DATA", () => {
  const t = content.en;
  const payload = {
    generatedAt: "2026-09-23T10:00:00.000Z",
    source: "mock",
    dataQuality: "partial",
    levels: [{ id: "L1", definition: "Mockup: interfaces on mock data" }],
    games: [
      {
        id: "ares1",
        name: "ARES-1",
        stage: "beta",
        level: "L1",
        connected: [],
        disconnected: [{ id: "game-events", reason: "adapter not configured" }],
      },
    ],
    apps: [{ id: "watchtower-api", name: "Watchtower API", connected: false, reason: "mock" }],
  };
  const html = render(
    h(ui.EcosystemStatus, {
      t,
      status: { status: "ok", data: payload },
      inventory: null,
    }),
  );
  assert.match(html, /DEMO DATA/);
  assert.match(html, /L1/);
  assert.match(html, /adapter not configured/);
  assert.match(html, /data-state demo/);
});

test("a missing ecosystem endpoint renders its reason, not invented levels", () => {
  const t = content.en;
  const html = render(
    h(ui.EcosystemStatus, {
      t,
      status: { status: "unavailable", reason: "endpoint_not_deployed" },
      inventory: { configured: 0, total: 5, demo: false, asOf: null },
    }),
  );
  assert.match(html, /missing from the current hub build/i);
  assert.match(html, /GET \/api\/ecosystem\/status/);
  // Registry levels are documentation of the hub vocabulary, never assigned.
  assert.match(html, /L0/);
  assert.match(html, /data-quality="unavailable"/);
  assert.equal(/data-connected="true"/.test(html), false);
});

test("a zero-profit quarter is shown as $0 with an explanation", () => {
  const t = content.en;
  const rows = [
    {
      id: "snap-1",
      period: "2027-Q1",
      createdAt: "2027-01-01T00:00:00.000Z",
      immutable: true,
      profit: 0,
      quality: "complete",
      demo: false,
      href: "/api/investors/snapshots",
    },
    {
      id: "snap-2",
      period: "2027-Q2",
      createdAt: "2027-04-01T00:00:00.000Z",
      immutable: true,
      profit: 200000,
      quality: "complete",
      demo: false,
      href: "/api/investors/snapshots",
    },
  ];
  const html = render(
    h(ui.Snapshots, {
      t,
      snapshots: { status: "ok", rows, data: {} },
      state: "ready",
      reason: null,
    }),
  );
  assert.match(html, /\$0/);
  assert.match(html, /No profit — the dividend is \$0/);
  // 200,000 x 25% / 100 = 500 per year, 125 per quarter.
  assert.match(html, /\$125/);
  assert.match(html, /2027-01-01/);
  assert.match(html, /divisor|4/);
});

test("an empty snapshot list states the rule instead of showing zeros", () => {
  const t = content.en;
  const html = render(
    h(ui.Snapshots, {
      t,
      snapshots: { status: "unavailable", rows: [], data: null },
      state: "unavailable",
      reason: "endpoint_not_deployed",
    }),
  );
  assert.match(html, /operator confirmation/i);
  assert.match(html, /endpoint is missing from the current hub build/i);
  // No snapshot row may be rendered, and no per-row figure may appear.
  assert.match(html, /empty-cell/);
  assert.equal(/snapshotId/.test(html), false);
  assert.equal(/<td[^>]*data-label/.test(html), false);
});

test("the compliance block publishes pending gates instead of addresses", () => {
  const t = content.en;
  const html = render(h(ui.Compliance, { t, saleGate: false }));
  assert.match(html, /KYC \/ AML/);
  assert.match(html, /In progress/);
  assert.match(html, /not published/i);
  // No wallet address or mint address may appear while unconfirmed.
  assert.equal(/[1-9A-HJ-NP-Za-km-z]{32,}/.test(html), false);
});
