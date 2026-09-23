import React, { useState, useEffect, useRef, useId } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Check,
  Plus,
  X,
  Menu,
  ShieldCheck,
  Database,
  Layers3,
  Activity,
  LayoutDashboard,
  ChartNoAxesCombined,
  Users,
  Radio,
  Eye,
  LockKeyhole,
  CircleDot,
  Globe2,
  Play,
  ScanLine,
  Wallet,
  FileText,
  ExternalLink,
  Mail,
  CheckCircle2,
  Info,
  LoaderCircle,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertTriangle,
  Server,
  Scale,
  Banknote,
  ShieldAlert,
  Clock,
  Link2,
  Link2Off,
  Gauge,
  Gavel,
  Boxes,
} from "lucide-react";
import { content } from "./content";
import { config, saleReady, sharePerNft } from "./config";
import {
  calculateShare,
  getLanguage,
  money,
  moneyOrDash,
  percent,
  stampUtc,
  nextSnapshot,
  isoDay,
  snapshotDates,
  quarterForMonth,
} from "./math";
import { NUMBERS, QUALITY, describeSource } from "./numbers";
import {
  loadDashboardData,
  buildMetrics,
  buildLeadPayload,
  readConsents,
  writeConsents,
  normalizeEcosystemStatus,
  normalizeSnapshots,
  adapterInventory,
  isDemo,
  SOURCE_LABEL,
} from "./api";
import "./styles.css";

const navIds = ["ecosystem", "watchtower", "math", "roadmap"];
const gameImages = ["ares", "farming", "neon", "guttercaps"];
const fundColors = ["#37e5a0", "#a78bfa", "#71b8d1", "#ffb85c", "#637087"];
const cx = (...classes) => classes.filter(Boolean).join(" ");

/* ------------------------------------------------------------------ *
 * Honest-data primitives.
 *
 * Every number on the page is rendered through one of these. They are the
 * only components allowed to print a figure, so the dataQuality badge, the
 * asOf stamp and the source line can never be forgotten.
 * ------------------------------------------------------------------ */

const QUALITY_COLOR = {
  [QUALITY.COMPLETE]: "green",
  [QUALITY.PARTIAL]: "orange",
  [QUALITY.UNAVAILABLE]: "gray",
};

/** Registry-backed metric: value + source + asOf + quality, all declarative. */
const staticMetric = (token) => {
  const entry = NUMBERS[token];
  if (!entry) return null;
  return {
    id: token,
    value: entry.value,
    quality: entry.quality,
    asOf: entry.asOf,
    demo: Boolean(entry.demo),
    source: entry.source,
    note: entry.note || "",
    formula: entry.formula || "",
  };
};

function QualityBadge({ quality, t, className = "" }) {
  const key = QUALITY_COLOR[quality] ? quality : QUALITY.UNAVAILABLE;
  return (
    <Badge color={QUALITY_COLOR[key]} dot className={cx("quality-badge", className)}>
      {t.data.quality[key]}
    </Badge>
  );
}

function DemoChip({ t }) {
  return (
    <span className="demo-chip" title={t.data.demoNote}>
      {t.data.demo}
    </span>
  );
}

/**
 * The audit trail under a figure: source, asOf (UTC), formula, quality.
 * Collapsed behind a keyboard-reachable toggle so it never crowds the layout.
 */
function MetricTrace({ metric, t, formula, extra }) {
  const [open, setOpen] = useState(false);
  const asOf = stampUtc(metric && metric.asOf);
  return (
    <span className="metric-trace-wrap">
      <button
        type="button"
        className="metric-info"
        aria-expanded={open}
        aria-label={`${t.data.showSource}: ${metric && metric.id ? metric.id : ""}`}
        onClick={() => setOpen(!open)}
      >
        <Info size={11} />
      </button>
      <span className="metric-trace" hidden={!open} role="note">
        <span>
          <b>{t.data.source}</b> {metric && metric.source}
        </span>
        <span>
          <b>{t.data.asOf}</b> {asOf || "—"}{" "}
          <span className="mono">({t.data.timezone})</span>
        </span>
        {(formula || (metric && metric.formula)) && (
          <span>
            <b>{t.data.formula}</b>{" "}
            <code>{formula || metric.formula}</code>
          </span>
        )}
        {metric && metric.note && <span>{metric.note}</span>}
        {metric && metric.demo && <span>{t.data.demoNote}</span>}
        {extra}
      </span>
    </span>
  );
}

/**
 * A single figure. `format` decides the notation, never the value.
 * `null` renders as an em dash and an `unavailable` badge — "no data" and
 * "zero" are different facts and must never look the same.
 */
function Metric({
  token,
  metric,
  t,
  format = (v) => String(v),
  className = "",
  badge = true,
  trace = true,
  as = "span",
  formula,
  children,
}) {
  const record = metric || staticMetric(token);
  const empty = !record || record.value === null || record.value === undefined;
  const Tag = as;
  const quality = empty ? QUALITY.UNAVAILABLE : record.quality;
  return (
    <Tag
      className={cx("metric", className)}
      data-metric={record ? record.id : token || ""}
      data-quality={quality}
      data-demo={record && record.demo ? "true" : "false"}
    >
      <span className="metric-value">
        {empty ? "—" : format(record.value)}
        {children}
      </span>
      {badge && <QualityBadge quality={quality} t={t} />}
      {record && record.demo && record.value !== null && <DemoChip t={t} />}
      {trace && (
        <MetricTrace metric={record} t={t} formula={formula} />
      )}
    </Tag>
  );
}

/**
 * Banner that states, once per section, whether the figures below come from
 * the live hub, from its mock mode, or not at all.
 */
function DataStateBar({ state, reason, t, onRetry, updatedAt, demo }) {
  if (state === "loading") {
    return (
      <div className="data-state loading">
        <LoaderCircle className="spin" size={14} />
        {t.data.loading}
      </div>
    );
  }
  if (state === "ready" && demo) {
    return (
      <div className="data-state demo">
        <AlertTriangle size={14} />
        <span>{t.data.mockBanner}</span>
        {updatedAt && (
          <span className="data-stamp mono">
            <Clock size={12} />
            {t.data.updated}: {stampUtc(updatedAt)}
          </span>
        )}
      </div>
    );
  }
  if (state === "ready") {
    return (
      <div className="data-state ready">
        <Link2 size={14} />
        <span>{t.data.readOnly}</span>
        {updatedAt && (
          <span className="data-stamp mono">
            <Clock size={12} />
            {t.data.updated}: {stampUtc(updatedAt)}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="data-state unavailable" role="status">
      <Link2Off size={14} />
      <span>
        <b>{t.data.unavailableTitle}.</b>{" "}
        {t.data.reasons[reason] || t.data.reasons.network_error}
      </span>
      {onRetry && (
        <button type="button" className="text-button" onClick={onRetry}>
          <RefreshCw size={12} />
          {t.data.retry || t.hub.retry}
        </button>
      )}
    </div>
  );
}
function Logo({ small = false }) {
  return (
    <span className={cx("brand", small && "small")}>
      <span className="brand-mark">w</span>
      <span>
        watchtower<span className="brand-period">.</span>
      </span>
    </span>
  );
}
function Badge({ children, color = "green", dot = false, className = "" }) {
  return (
    <span className={cx("badge", color, className)}>
      {dot && <i />}
      {children}
    </span>
  );
}
function Label({ children }) {
  return (
    <div className="section-label">
      <span />
      {children}
    </div>
  );
}
function SectionHeader({ label, title, body, children }) {
  return (
    <div className="section-heading">
      <div>
        <Label>{label}</Label>
        <h2>{title}</h2>
        {body && <p>{body}</p>}
      </div>
      {children}
    </div>
  );
}
function DemoBadge() {
  return <Badge>DEMO DATA</Badge>;
}

function Chart({ mini = false }) {
  const id = useId().replaceAll(":", "");
  return (
    <svg
      viewBox="0 0 600 160"
      className={cx("chart", mini && "mini")}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#37e5a0" stopOpacity=".23" />
          <stop offset="100%" stopColor="#37e5a0" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[25, 65, 105, 145].map((y) => (
        <line
          key={y}
          x1="0"
          x2="600"
          y1={y}
          y2={y}
          stroke="#26302f"
          strokeDasharray="3 5"
        />
      ))}
      <path
        d="M0 138 L20 134 L40 142 L60 120 L80 130 L100 111 L120 117 L140 92 L160 103 L180 81 L200 95 L220 77 L240 80 L260 63 L280 85 L300 69 L320 71 L340 50 L360 57 L380 39 L400 62 L420 32 L440 38 L460 24 L480 40 L500 28 L520 32 L540 16 L560 22 L580 6 L600 13 L600 160 L0 160 Z"
        fill={`url(#${id})`}
      />
      <path
        d="M0 138 L20 134 L40 142 L60 120 L80 130 L100 111 L120 117 L140 92 L160 103 L180 81 L200 95 L220 77 L240 80 L260 63 L280 85 L300 69 L320 71 L340 50 L360 57 L380 39 L400 62 L420 32 L440 38 L460 24 L480 40 L500 28 L520 32 L540 16 L560 22 L580 6 L600 13"
        fill="none"
        stroke="#37e5a0"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M0 148 L30 140 L60 144 L90 131 L120 133 L150 116 L180 127 L210 113 L240 128 L270 113 L300 105 L330 108 L360 98 L390 103 L420 94 L450 107 L480 92 L510 96 L540 74 L570 86 L600 72"
        fill="none"
        stroke="#a78bfa"
        strokeWidth="1.5"
        strokeOpacity=".65"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Dashboard({ t, compact = false, initialTab = 0, onTabChange, data }) {
  const [tab, setTab] = useState(initialTab);
  const [expanded, setExpanded] = useState(false);
  const uid = useId();
  const d = t.dashboard;
  const live = data && data.state === "ready";
  const metrics = (data && data.metrics) || {};
  const gameRows = t.games.map((game, i) => {
    const apiGame =
      live && Array.isArray(data.games)
        ? data.games.find(
            (entry) =>
              entry && (entry.name === game.name || entry.id === gameImages[i]),
          )
        : null;
    return {
      name: game.name,
      stage: game.stage,
      color: fundColors[i],
      quality: apiGame
        ? apiGame.dataQuality || QUALITY.PARTIAL
        : QUALITY.UNAVAILABLE,
      demo: Boolean(data && data.demo) && Boolean(apiGame),
      players: apiGame ? apiGame.players : null,
      volume: apiGame ? apiGame.volume : null,
      source: apiGame ? `${SOURCE_LABEL.report} · games[]` : null,
    };
  });
  const funnelStages = (live && data.funnel) || null;
  const channelNames = ["SEO / GEO", "X / Blinks", "Shorts / TikTok / Reels", "Whale radar", "TipLink"];
  const tabIcons = [LayoutDashboard, ChartNoAxesCombined, Users, Radio];
  function choose(i) {
    setTab(i);
    onTabChange?.(i);
  }
  return (
    <div
      className={cx("dashboard", compact && "compact", expanded && "expanded")}
    >
      <div className="dash-top">
        <Logo small />
        <span className="dash-top-title">{d.os}</span>
        <DemoBadge />
      </div>
      <div className="dash-shell">
        <aside className="dash-sidebar" aria-hidden="true">
          <span className="sidebar-active">
            <LayoutDashboard size={16} />
          </span>
          <ChartNoAxesCombined size={16} />
          <Layers3 size={16} />
          <Users size={16} />
          <Radio size={16} />
          <div className="sidebar-bottom">
            <ShieldCheck size={16} />
          </div>
        </aside>
        <div className="dash-main">
          <div className="dash-heading">
            <div>
              <span className="dash-kicker">WORKSPACE / LEO GAMES STUDIO</span>
              <h3>{d.title}</h3>
              <p>{d.welcome}</p>
            </div>
            <Badge color="gray" dot>
              {d.live}
            </Badge>
          </div>
          {!compact && (
            <div
              className="dash-tabs"
              role="tablist"
              aria-label="Watchtower demo"
            >
              {d.tabs.map((name, i) => {
                const Icon = tabIcons[i];
                return (
                  <button
                    id={`${uid}-tab-${i}`}
                    aria-controls={`${uid}-panel`}
                    aria-selected={tab === i}
                    role="tab"
                    tabIndex={tab === i ? 0 : -1}
                    onKeyDown={(e) => {
                      if (
                        ["ArrowRight", "ArrowLeft", "Home", "End"].includes(
                          e.key,
                        )
                      ) {
                        e.preventDefault();
                        const n =
                          e.key === "Home"
                            ? 0
                            : e.key === "End"
                              ? 3
                              : (i + (e.key === "ArrowRight" ? 1 : 3)) % 4;
                        choose(n);
                        document.getElementById(`${uid}-tab-${n}`).focus();
                      }
                    }}
                    key={name}
                    onClick={() => choose(i)}
                    className={tab === i ? "active" : ""}
                  >
                    <Icon size={14} />
                    {name}
                  </button>
                );
              })}
            </div>
          )}
          <div
            id={`${uid}-panel`}
            role={compact ? undefined : "tabpanel"}
            aria-labelledby={compact ? undefined : `${uid}-tab-${tab}`}
            tabIndex={compact ? undefined : 0}
          >
            {tab === 0 && (
              <>
                <div className="dash-kpis">
                  <div>
                    <span>{d.games}</span>
                    <Metric token="games" t={t} className="dash-number" />
                    <em>
                      <i />
                      {d.integration}
                    </em>
                  </div>
                  <div>
                    <span>{d.sources}</span>
                    <Metric token="channels" t={t} className="dash-number" />
                    <em>
                      <i />
                      {d.integration}
                    </em>
                  </div>
                  <div>
                    <span>{d.profit}</span>
                    <Metric
                      token="netProfit"
                      t={t}
                      className="dash-number"
                      metric={{
                        id: "report.netProfit",
                        value: null,
                        quality: QUALITY.UNAVAILABLE,
                        asOf: data && data.updatedAt,
                        demo: false,
                        source: `${SOURCE_LABEL.report} · metrics`,
                        note: "The hub investor report does not publish net profit yet.",
                      }}
                      format={(v) => money(v)}
                    />
                    <em className="muted">
                      <i />
                      {d.unavailable}
                    </em>
                  </div>
                </div>
                <div className="dash-chart-block">
                  <div className="dash-block-title">
                    <span>
                      <Activity size={13} />
                      {d.events}
                    </span>
                    <span className="chart-legend">
                      <i />
                      on-chain <i />
                      off-chain
                    </span>
                  </div>
                  <Chart mini={compact} />
                  <div className="chart-caption">{d.eventNote}</div>
                </div>
                <div className="dash-game-table">
                  {gameRows.map((row) => (
                    <div key={row.name}>
                      <span>
                        <i style={{ background: row.color }} />
                        {row.name}
                      </span>
                      <span
                        className={
                          row.stage === "prototype" ? "purple-text" : "green-text"
                        }
                      >
                        {row.stage}
                      </span>
                      <span className="quality-cell">
                        <QualityBadge quality={row.quality} t={t} />
                        {row.demo && <DemoChip t={t} />}
                      </span>
                    </div>
                  ))}
                </div>
                {!live && (
                  <div className="dash-placeholder">
                    <Info size={16} />
                    {d.noLive}
                  </div>
                )}
              </>
            )}
            {tab === 1 && (
              <div className="dash-alt">
                <div className="dash-block-title">
                  <span>
                    <ChartNoAxesCombined size={15} />
                    {d.tabs[1]}
                  </span>
                  <Badge color="orange">partial</Badge>
                </div>
                <div className="funnel">
                  {d.funnelStages.map((name, i) => {
                    const stage = funnelStages
                      ? funnelStages.find((entry) => entry && entry.stage === i + 1) ||
                        funnelStages[i]
                      : null;
                    return (
                      <div key={name} style={{ width: `${100 - i * 17}%` }}>
                        <span>{name}</span>
                        <b>{stage && typeof stage.count === "number" ? stage.count : "—"}</b>
                      </div>
                    );
                  })}
                </div>
                <p className="chart-caption">{d.funnelNote}</p>
                {funnelStages && (
                  <p className="dash-source mono">
                    <Link2 size={11} /> {SOURCE_LABEL.readModel} · funnel
                  </p>
                )}
                <div className="dash-placeholder">
                  <Info size={16} />
                  {d.noLive}
                </div>
              </div>
            )}
            {tab === 2 && (
              <div className="dash-alt">
                <div className="dash-block-title">
                  <span>
                    <Wallet size={15} />
                    {d.wallet}
                  </span>
                  <Badge color="orange">{d.planned}</Badge>
                </div>
                <div className="investor-demo">
                  <div>
                    <span>Ecosystem Share</span>
                    <strong>
                      {sharePerNft}
                      <small>%</small>
                    </strong>
                    <p>{t.nftProfit}</p>
                  </div>
                  <LockKeyhole size={46} />
                </div>
                <div className="dash-report">
                  <span>
                    <FileText size={16} />
                    {d.report}
                  </span>
                  <span className="mono">{SOURCE_LABEL.report}</span>
                </div>
                <div className="dash-report">
                  <span>
                    <FileText size={16} />
                    {d.snapshots}
                  </span>
                  <span className="mono">{SOURCE_LABEL.snapshots}</span>
                </div>
                <p className="chart-caption">{d.investorNote}</p>
                <p className="dash-source mono">
                  <Link2 size={11} />
                  {t.snapshots.calendar}
                </p>
              </div>
            )}
            {tab === 3 && (
              <div className="dash-alt">
                <div className="dash-block-title">
                  <span>
                    <Radio size={15} />
                    {d.channels}
                  </span>
                  <Badge color="orange">partial</Badge>
                </div>
                <div className="traffic-demo-stats">
                  {["campaigns", "trafficSources", "targetPages"].map((token, i) => (
                    <div key={token}>
                      <Metric token={token} t={t} />
                      <span>{t.trafficStats[i]}</span>
                    </div>
                  ))}
                  <div>
                    <Metric token="adSpend" t={t} format={(v) => money(v)} />
                    <span>{t.trafficStats[3]}</span>
                  </div>
                </div>
                {channelNames.map((s) => (
                  <div className="dash-report" key={s}>
                    <span>
                      <CircleDot size={12} />
                      {s}
                    </span>
                    <span className="quality-cell">
                      <QualityBadge
                        quality={
                          live && data.campaigns
                            ? QUALITY.PARTIAL
                            : QUALITY.UNAVAILABLE
                        }
                        t={t}
                      />
                    </span>
                  </div>
                ))}
                <p className="chart-caption">
                  {d.trafficNote} · {d.bot}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="dash-bottom">
        <span>
          <span className="status-dot" />
          {d.preview}
        </span>
        <span className="mono">
          {live
            ? data.updatedAt
              ? `${t.data.updated}: ${stampUtc(data.updatedAt)}`
              : t.data.readOnly
            : d.noLive}
        </span>
        {!compact && (
          <button
            aria-label={expanded ? d.collapse : d.expand}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Studio status screen — GET /api/ecosystem/status (interlock i-13)
 * ------------------------------------------------------------------ */

const STATUS_SCHEMA = [
  "{",
  '  "generatedAt": "2026-09-23T00:00:00.000Z",',
  '  "source": "hub",',
  '  "dataQuality": "complete | partial | unavailable",',
  '  "levels": [{ "id": "L0", "definition": "..." }],',
  '  "games": [{ "id": "ares1", "name": "ARES-1", "stage": "beta",',
  '              "level": "L1", "connected": ["watchtower-api"],',
  '              "disconnected": [{ "id": "game-events", "reason": "..." }] }],',
  '  "apps": [{ "id": "watchtower-api", "name": "Watchtower API",',
  '             "level": "L1", "connected": false, "reason": "..." }]',
  "}",
]; // numbers-lint-ignore (schema documentation, not a displayed figure)

function StatusRow({ item, t, demo }) {
  const connected = item.connectedFlag === true;
  const disconnected = item.connectedFlag === false;
  return (
    <div className="status-row" data-connected={connected ? "true" : "false"}>
      <div className="status-row-head">
        <strong>{item.name}</strong>
        {item.level && <span className="mono level-chip">{item.level}</span>}
        {item.stage && <span className="mono stage-chip">{item.stage}</span>}
        {connected && (
          <Badge color="green" dot>
            <Link2 size={11} /> {t.hub.connected}
          </Badge>
        )}
        {(disconnected || !connected) && (
          <Badge color="gray" dot>
            <Link2Off size={11} /> {t.hub.disconnected}
          </Badge>
        )}
        {demo && <DemoChip t={t} />}
      </div>
      {item.connected.length > 0 && (
        <ul className="status-list">
          {item.connected.map((entry) => (
            <li key={entry}>
              <Link2 size={11} />
              <span className="mono">{entry}</span>
            </li>
          ))}
        </ul>
      )}
      {item.disconnected.length > 0 && (
        <ul className="status-list off">
          {item.disconnected.map((entry) => (
            <li key={entry.id}>
              <Link2Off size={11} />
              <span className="mono">{entry.id}</span>
              {entry.reason && <em>{entry.reason}</em>}
            </li>
          ))}
        </ul>
      )}
      {item.notes && <p className="status-note">{item.notes}</p>}
    </div>
  );
}

function EcosystemStatus({ t, status, inventory, onRetry, updatedAt }) {
  const normalized =
    status.status === "ok" ? normalizeEcosystemStatus(status.data) : null;
  const reason =
    status.status === "ok" && !normalized ? "not_json" : status.reason;
  const levels =
    normalized && normalized.levels.length > 0 ? normalized.levels : t.hub.levels.map(([id, definition]) => ({ id, definition }));
  const demo = Boolean(normalized && normalized.demo);

  return (
    <section className="section status-section" id="status">
      <div className="container">
        <SectionHeader label={t.hub.label} title={t.hub.title} body={t.hub.body}>
          <span className="section-side-note mono">
            <Server size={13} /> {t.hub.endpoint}{" "}
            <span className="green-text">{SOURCE_LABEL.ecosystemStatus}</span>
          </span>
        </SectionHeader>

        <DataStateBar
          state={status.status === "ok" ? "ready" : "unavailable"}
          reason={reason}
          t={t}
          onRetry={onRetry}
          updatedAt={updatedAt}
          demo={demo}
        />

        <div className="status-levels">
          <div className="status-levels-head">
            <h3>{t.hub.levelsTitle}</h3>
            <p>{t.hub.levelsNote}</p>
          </div>
          <ol className="level-legend">
            {levels.map((level) => (
              <li key={level.id}>
                <span className="mono level-chip">{level.id}</span>
                <p>{level.definition}</p>
              </li>
            ))}
          </ol>
        </div>

        {normalized && (normalized.games.length > 0 || normalized.apps.length > 0) ? (
          <div className="status-grid">
            <div className="status-column">
              <h3>
                <Boxes size={14} /> {t.hub.games}
              </h3>
              {normalized.games.map((game) => (
                <StatusRow item={game} t={t} demo={demo} key={game.id} />
              ))}
            </div>
            <div className="status-column">
              <h3>
                <Server size={14} /> {t.hub.apps}
              </h3>
              {normalized.apps.map((app) => (
                <StatusRow item={app} t={t} demo={demo} key={app.id} />
              ))}
              <p className="caption">{t.hub.appsNote}</p>
            </div>
          </div>
        ) : (
          <div className="status-pending">
            <div className="status-pending-copy">
              <h3>
                <AlertTriangle size={16} /> {t.hub.pendingTitle}
              </h3>
              <p>{t.hub.pendingBody}</p>
              <p className="mono">{t.hub.pendingNext}</p>
            </div>
            <div className="status-pending-copy">
              <h3>
                <Link2Off size={16} /> {t.hub.inventoryTitle}
              </h3>
              <p>{t.hub.inventoryNote}</p>
              <div className="status-inventory">
                <Metric
                  token="configuredAdapters"
                  t={t}
                  metric={{
                    ...staticMetric("configuredAdapters"),
                    value:
                      inventory && inventory.configured !== undefined
                        ? inventory.configured
                        : null,
                    demo: Boolean(inventory && inventory.demo),
                    source: SOURCE_LABEL.readModel,
                    asOf: inventory && inventory.asOf,
                  }}
                  format={(v) => `${v} / ${inventory && inventory.total !== undefined ? inventory.total : "—"}`}
                />
                <span className="status-inventory-label">{t.hub.adaptersLabel}</span>
              </div>
            </div>
            <div className="status-pending-copy">
              <h3>
                <Gauge size={16} /> {t.hub.schemaTitle}
              </h3>
              <p>{t.hub.schemaNote}</p>
              {/* The schema line wraps on narrow screens and scrolls on wide
                  ones; a scrollable region must be reachable by keyboard. */}
              <pre
                className="status-schema mono"
                tabIndex={0}
                aria-label={t.hub.schemaTitle}
              >
                <code>{STATUS_SCHEMA.join("\n")}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Snapshots and dividends — GET /api/investors/snapshots (interlock i-05)
 * ------------------------------------------------------------------ */

function snapshotsTableHead(t) {
  return t.snapshots.tableHead;
}

function SnapshotRows({ rows, t }) {
  return rows.map((row) => {
    const share = row.profit === null ? null : calculateShare(row.profit, config.supply, config.poolPercent);
    const zero = row.profit === 0;
    return (
      <tr key={row.id || row.period}>
        <td data-label={t.snapshots.tableHead[0]}>
          <span className="mono">{row.period || "—"}</span>
        </td>
        <td data-label={t.snapshots.tableHead[1]}>
          <span className="mono">{row.createdAt ? isoDay(row.createdAt) : "—"}</span>
        </td>
        <td data-label={t.snapshots.tableHead[2]}>
          <Metric
            token="snapshotProfit"
            t={t}
            metric={{
              id: `profit:${row.id}`,
              value: row.profit,
              quality: row.quality,
              asOf: row.createdAt,
              demo: row.demo,
              source: `${SOURCE_LABEL.snapshots} · snapshotId ${row.id}`,
              note: "Net profit for the quarter as published by the hub.",
            }}
            format={(v) => money(v, 2)}
          />
        </td>
        <td data-label={t.snapshots.tableHead[3]}>
          <span className="mono">{share ? moneyOrDash(share.pool, 2) : "—"}</span>
        </td>
        <td data-label={t.snapshots.tableHead[4]}>
          <span className="mono">{share ? moneyOrDash(share.quarterly, 2) : "—"}</span>
        </td>
        <td data-label={t.snapshots.tableHead[5]}>
          {zero ? (
            <span className="zero-note">
              <CircleDot size={11} /> {t.snapshots.statusZero}
            </span>
          ) : (
            <Badge color={row.immutable ? "green" : "orange"} dot>
              {row.immutable ? t.snapshots.statusPublished : t.snapshots.statusPending}
            </Badge>
          )}
        </td>
        <td data-label={t.snapshots.tableHead[6]}>
          <a className="mono source-link" href={row.href}>
            {SOURCE_LABEL.snapshots}
            <ArrowUpRight size={11} />
          </a>
        </td>
      </tr>
    );
  });
}

function Snapshots({ t, snapshots, state, reason, onRetry, updatedAt }) {
  const rows = snapshots.status === "ok" ? snapshots.rows : [];
  const demo = rows.some((row) => row.demo);
  const upcoming = snapshotDates(new Date().getUTCFullYear()).concat(
    snapshotDates(new Date().getUTCFullYear() + 1),
  );
  const next = nextSnapshot(new Date());
  const illustration = explainShareIllustration(t);

  return (
    <section className="section snapshots-section" id="snapshots">
      <div className="container">
        <SectionHeader
          label={t.snapshots.label}
          title={t.snapshots.title}
          body={t.snapshots.body}
        >
          <span className="section-side-note mono">
            {SOURCE_LABEL.snapshots}
          </span>
        </SectionHeader>

        <div className="snapshot-top">
          <div className="formula">
            <span>ƒ(x)</span>
            <code>{t.snapshots.formula}</code>
            <Check size={20} />
          </div>
          <p className="caption">
            <Info size={13} />
            {t.snapshots.formulaNote}
          </p>
        </div>

        <div className="snapshot-meta-grid">
          <div className="snapshot-meta">
            <h3>
              <Clock size={14} /> {t.snapshots.calendarTitle}
            </h3>
            <p>{t.snapshots.calendar}</p>
            <ul className="date-list mono">
              {upcoming.slice(0, 4).map((item) => (
                <li key={isoDay(item.date)}>
                  {isoDay(item.date)}
                  <span>
                    Q{quarterForMonth(item.month)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="caption">{t.snapshots.calendarNote}</p>
          </div>
          <div className="snapshot-meta">
            <h3>
              <Wallet size={14} /> {t.snapshots.holderTitle}
            </h3>
            <p>{t.snapshots.holder}</p>
            <p className="next-snapshot">
              <b>{t.snapshots.nextTitle}:</b>{" "}
              <span className="mono">{next ? isoDay(next.date) : "—"}</span>
            </p>
          </div>
          <div className="snapshot-meta">
            <h3>
              <CircleDot size={14} /> {t.snapshots.zeroTitle}
            </h3>
            <p>{t.snapshots.zero}</p>
          </div>
        </div>

        <DataStateBar
          state={state}
          reason={reason}
          t={t}
          onRetry={onRetry}
          updatedAt={updatedAt}
          demo={demo}
        />

        <div className="scenario-table snapshot-table">
          <table>
            <thead>
              <tr>
                {snapshotsTableHead(t).map((head) => (
                  <th scope="col" key={head}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                <SnapshotRows rows={rows} t={t} />
              ) : (
                <tr>
                  <td colSpan={snapshotsTableHead(t).length} className="empty-cell">
                    <span>{t.snapshots.empty}</span>
                    <em>{t.snapshots.emptyWhy}</em>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="trend-strip">
          <div className="trend-head">
            <h3>
              <Activity size={14} /> {t.snapshots.trendTitle}
            </h3>
            {state === "ready" && (
              <Badge color="gray" dot>
                {SOURCE_LABEL.trend}
              </Badge>
            )}
          </div>
          {t.snapshots.trendEmpty && (
            <p className="caption">{t.snapshots.trendEmpty}</p>
          )}
        </div>

        <div className="illustration-card">
          <div>
            <Badge color="orange">{t.scenarios}</Badge>
            <h3>{t.snapshots.illustrationTitle}</h3>
            <p>{t.snapshots.illustration}</p>
            <p className="caption">{t.snapshots.illustrationNote}</p>
          </div>
          <div className="illustration-metric">
            <Metric
              token="scenarioPerNft"
              t={t}
              metric={illustration}
              format={(v) => money(v)}
            />
            <span className="mono">/ NFT / year @ $200,000</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Illustration figure, computed from the formula, labelled "not a promise". */
function explainShareIllustration(t) {
  const profit = NUMBERS.scenarios.value[1];
  const share = calculateShare(profit, config.supply, config.poolPercent);
  return {
    id: "illustration:annual-per-nft",
    value: share.annual,
    quality: QUALITY.PARTIAL,
    asOf: NUMBERS.scenarios.asOf,
    demo: false,
    source: NUMBERS.scenarios.source,
    formula: t.snapshots.formula,
    note: t.snapshots.illustrationNote,
  };
}

/* ------------------------------------------------------------------ *
 * Legal boundaries, KYC/AML, mint transparency, operations (W4)
 * ------------------------------------------------------------------ */

function pendingValue(t, text) {
  return <span className="pending-chip">{text}</span>;
}

function Compliance({ t, saleGate }) {
  const { mint, legal, ops } = config;
  return (
    <section className="section compliance-section" id="compliance">
      <div className="container">
        <SectionHeader
          label={t.compliance.label}
          title={t.compliance.title}
          body={t.compliance.disclaimerTitle}
        />
        <div className="compliance-grid">
          <article className="compliance-card">
            <h3>
              <ScrollTextLike />
              {t.compliance.disclaimerTitle}
            </h3>
            <p>{t.compliance.disclaimer}</p>
            <h4>
              <ShieldAlert size={13} /> {t.compliance.riskTitle}
            </h4>
            <ul className="risk-list">
              {t.compliance.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </article>

          <article className="compliance-card">
            <h3>
              <Scale size={15} /> {t.compliance.kycTitle}
            </h3>
            <p>{t.compliance.kyc}</p>
            <div className="compliance-row">
              <span>{t.compliance.mintStatus}</span>
              {legal.kycStatus === "pending"
                ? pendingValue(t, t.compliance.kycPending)
                : <b>{legal.kycStatus}</b>}
            </div>
            <div className="compliance-row">
              <span>{t.compliance.jurisdictionTitle}</span>
              {legal.restrictedJurisdictionsPublished ? (
                <b>{legal.restrictedJurisdictions.join(", ")}</b>
              ) : (
                pendingValue(t, t.compliance.jurisdictionPending)
              )}
            </div>
            <p>{t.compliance.jurisdiction}</p>
            <div className="compliance-row">
              <span>{t.compliance.taxTitle}</span>
              {pendingValue(t, t.compliance.kycPending)}
            </div>
            <p>{t.compliance.tax}</p>
          </article>

          <article className="compliance-card">
            <h3>
              <Banknote size={15} /> {t.compliance.mintTitle}
            </h3>
            <p>{t.compliance.mint}</p>
            <div className="compliance-row">
              <span>{t.compliance.mintSupply}</span>
              <Metric token="supply" t={t} format={(v) => `${v} NFT`} />
            </div>
            <div className="compliance-row">
              <span>{t.compliance.mintStatus}</span>
              {mint.addressPublished && mint.programAddress ? (
                <b className="mono">{mint.programAddress}</b>
              ) : (
                pendingValue(t, t.compliance.mintInProgress)
              )}
            </div>
            <div className="compliance-row">
              <span>{t.compliance.mintMultisig}</span>
              {mint.multisigPublished && mint.multisig ? (
                <b className="mono">{mint.multisig}</b>
              ) : (
                pendingValue(t, t.compliance.mintInProgress)
              )}
            </div>
            <div className="compliance-row">
              <span>{t.compliance.mintAudit}</span>
              {mint.auditUrl ? (
                <a href={mint.auditUrl} target="_blank" rel="noreferrer" className="mono">
                  {mint.auditUrl}
                </a>
              ) : (
                pendingValue(t, t.compliance.mintInProgress)
              )}
            </div>
            <div className="compliance-row">
              <span>{t.compliance.walletTitle}</span>
              <Metric token="walletLimit" t={t} format={(v) => `${v} ${t.perWallet}`} />
            </div>
            <p>{t.compliance.wallet}</p>
          </article>

          <article className="compliance-card">
            <h3>
              <FileText size={15} /> {t.compliance.termsTitle}
            </h3>
            <p>{t.compliance.terms}</p>
            <div className="compliance-row">
              <span>{t.offerTerms}</span>
              {config.termsUrl ? (
                <a href={config.termsUrl} target="_blank" rel="noreferrer">
                  {t.offerTerms}
                </a>
              ) : (
                pendingValue(t, t.termsBadge)
              )}
            </div>
            <p className="caption">{t.compliance.reviewNote}</p>
            <h4>
              <Gauge size={13} /> {t.compliance.opsTitle}
            </h4>
            <p>{t.compliance.opsText}</p>
            <div className="compliance-row">
              <span>{t.compliance.opsPending}</span>
              <Badge color="orange" dot>
                {t.planned}
              </Badge>
            </div>
            <div className="compliance-row">
              <span>{t.compliance.mintStatus}</span>
              <Badge color={saleGate ? "green" : "gray"} dot>
                {saleGate ? t.saleLive : t.saleClosed}
              </Badge>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function ScrollTextLike() {
  return <Gavel size={15} />;
}

function TowerArt() {
  const uid = useId().replaceAll(":", "");
  return (
    <svg className="tower-art" viewBox="0 0 360 280" aria-hidden="true">
      <defs>
        <linearGradient id={`tower-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#76ffd0" />
          <stop offset=".45" stopColor="#159361" />
          <stop offset="1" stopColor="#082d23" />
        </linearGradient>
        <linearGradient id={`side-${uid}`} x1="0" x2="1">
          <stop stopColor="#0a3e2b" />
          <stop offset="1" stopColor="#1e9468" />
        </linearGradient>
        <radialGradient id={`glow-${uid}`}>
          <stop stopColor="#37e5a0" stopOpacity=".27" />
          <stop offset="1" stopColor="#37e5a0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="180" cy="155" rx="175" ry="125" fill={`url(#glow-${uid})`} />
      <g stroke="#37e5a0" fill="none" opacity=".17">
        <path d="M0 206 180 108 360 206M0 230 180 132 360 230M0 254 180 156 360 254M0 278 180 180 360 278" />
        <path d="m20 160 280 150m-240-170 280 150m-280 0L340 140m-320 20 280 150M60 290 340 140" />
      </g>
      <ellipse
        cx="180"
        cy="228"
        rx="125"
        ry="40"
        fill="none"
        stroke="#37e5a0"
        opacity=".35"
      />
      <ellipse
        cx="180"
        cy="228"
        rx="100"
        ry="30"
        fill="none"
        stroke="#37e5a0"
        opacity=".15"
      />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(0,${-i * 34})`}>
          <path
            d="m180 175 58 31-58 32-58-32z"
            fill={`url(#tower-${uid})`}
            stroke="#69edb3"
            strokeWidth=".6"
          />
          <path
            d="m122 206 58 32v13l-58-32z"
            fill="#0c5c3c"
            stroke="#2ab877"
            strokeWidth=".6"
          />
          <path
            d="m180 238 58-32v13l-58 32z"
            fill={`url(#side-${uid})`}
            stroke="#33b580"
            strokeWidth=".6"
          />
        </g>
      ))}
      <path
        d="m180 34 65 35-65 35-65-35z"
        fill={`url(#tower-${uid})`}
        stroke="#a1ffdc"
      />
      <path d="m115 69 65 35v20l-65-35z" fill="#107247" stroke="#43e7a2" />
      <path d="m180 104 65-35v20l-65 35z" fill="#083c2b" stroke="#43e7a2" />
      <path d="m180 34 0-17M115 69H91m154 0h24" stroke="#8affe0" />
      <circle cx="180" cy="16" r="3" fill="#9fffd8" />
      <path
        d="m157 61 5 18 12-5 3-12 10 5 12-5-5-18-11 5 3 10-8-4-9 5-2-11z"
        fill="#09271b"
      />
      <g fill="#6eecb9">
        <circle cx="60" cy="185" r="2" />
        <circle cx="297" cy="168" r="2" />
        <circle cx="284" cy="76" r="2" />
        <circle cx="71" cy="72" r="2" />
      </g>
      <path
        d="M60 185v-40l46-25m191 48v-35l-37-20"
        stroke="#37e5a0"
        strokeDasharray="3 5"
        fill="none"
        opacity=".45"
      />
    </svg>
  );
}

function TermsModal({ t, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current.focus();
    function key(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = ref.current.querySelectorAll("button,a[href]");
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="terms-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
        tabIndex={-1}
        ref={ref}
      >
        <button
          className="modal-close icon-button"
          onClick={onClose}
          aria-label={t.close}
        >
          <X size={21} />
        </button>
        <Badge color="orange">{t.termsBadge}</Badge>
        <h2 id="terms-title">{t.termsTitle}</h2>
        <p>{t.termsIntro}</p>
        <ul>
          {t.termsItems.map((s) => (
            <li key={s}>
              <Check size={17} />
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <p className="terms-end">{t.termsEnd}</p>
        {config.termsUrl && (
          <a
            className="button primary"
            href={config.termsUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t.termsRead}
            <ExternalLink size={16} />
          </a>
        )}
      </div>
    </div>
  );
}

function App() {
  const [lang, setLang] = useState(() =>
    getLanguage(window.location.search, window.location.pathname),
  );
  const [menu, setMenu] = useState(false);
  const [terms, setTerms] = useState(false);
  const [contactNote, setContactNote] = useState(false);
  const [annualProfit, setAnnualProfit] = useState(
    NUMBERS.scenarios.value[1],
  );
  const [email, setEmail] = useState("");
  const [formStatus, setFormStatus] = useState("idle");
  const [activeSection, setActiveSection] = useState("");
  const [hub, setHub] = useState({ state: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [trapField, setTrapField] = useState("");
  const t = content[lang];
  const result = calculateShare(
    annualProfit,
    config.supply,
    config.poolPercent,
  );
  const report = hub.report || { status: "loading" };
  const readModel = (hub.readModel && hub.readModel.status === "ok" && hub.readModel.data) || null;
  const traffic = (hub.traffic && hub.traffic.status === "ok" && hub.traffic.data) || null;
  const dashboardData = React.useMemo(() => {
    const payload = report.status === "ok" ? report.data : null;
    const state =
      report.status === "ok"
        ? "ready"
        : report.status === "loading"
          ? "loading"
          : "unavailable";
    return {
      state,
      reason: report.reason,
      metrics: payload
        ? buildMetrics(
            payload,
            {
              newPlayers: "newPlayers",
              activePlayers: "activePlayers",
              volume: "volume",
              treasury: "treasury",
              minted: "minted",
              burned: "burned",
            },
            { sourceLabel: SOURCE_LABEL.report },
          )
        : {},
      games: payload && Array.isArray(payload.games) ? payload.games : null,
      funnel:
        readModel && Array.isArray(readModel.funnel) ? readModel.funnel : null,
      campaigns: traffic ? traffic.campaigns || [] : null,
      demo: Boolean(payload && isDemo(payload)),
      updatedAt: payload ? payload.generatedAt || null : null,
    };
  }, [report, readModel, traffic]);
  const snapshotsResult = hub.snapshots || { status: "loading" };
  const snapshotRows =
    snapshotsResult.status === "ok"
      ? normalizeSnapshots(snapshotsResult.data)
      : [];
  const termsClose = React.useCallback(() => setTerms(false), []);
  useEffect(() => {
    function sync() {
      setLang(getLanguage(window.location.search, window.location.pathname));
    }
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.metaTitle;
    // Meta tags are updated defensively: a missing tag must never break the
    // page after mount, and the share previews must follow the language.
    const setMeta = (selector, content) => {
      const node = document.querySelector(selector);
      if (node) node.setAttribute("content", content);
    };
    setMeta('meta[name="description"]', t.metaDescription);
    setMeta('meta[property="og:title"]', t.metaTitle);
    setMeta('meta[property="og:description"]', t.metaDescription);
    setMeta('meta[name="twitter:title"]', t.metaTitle);
    setMeta('meta[name="twitter:description"]', t.metaDescription);
    setMeta('meta[property="og:locale"]', lang === "ru" ? "ru_RU" : "en_US");
  }, [lang, t]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveSection(e.target.id);
        });
      },
      { rootMargin: "-15% 0px -50% 0px", threshold: 0 },
    );
    navIds.forEach((id) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    function esc(e) {
      if (e.key === "Escape") setMenu(false);
    }
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);
  /**
   * Read the hub once on mount (and on explicit retry). A failed endpoint
   * keeps its own failure; the page never substitutes another endpoint's
   * number for a missing one.
   */
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setHub((current) => ({ ...current, state: "loading" }));
    loadDashboardData({ signal: controller.signal }).then((results) => {
      if (!active) return;
      setHub({
        state: results.report.status === "ok" ? "ready" : "unavailable",
        ...results,
      });
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);
  function changeLanguage(l) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", l);
    window.history.pushState({}, "", url);
    setLang(l);
    setMenu(false);
  }
  /**
   * Lead submission. Consent is recorded locally before the request goes out
   * (interlock i-02) and the payload keeps the frozen four-key contract.
   * Spam protection: a honeypot field, a minimum fill time and a cooldown.
   */
  async function submit(e) {
    e.preventDefault();
    if (!config.formEndpoint) {
      setFormStatus("unavailable");
      return;
    }
    const secondsOnPage = (Date.now() - startedAt) / 1000;
    if (trapField.trim() || secondsOnPage < config.lead.minimumSubmitSeconds) {
      // A bot filled the hidden field or submitted instantly: drop silently.
      setFormStatus("idle");
      return;
    }
    const previous = readConsents();
    if (
      previous &&
      previous.lastSubmittedAt &&
      (Date.now() - new Date(previous.lastSubmittedAt).getTime()) / 1000 <
        config.lead.resubmitCooldownSeconds
    ) {
      setFormStatus("cooldown");
      return;
    }
    const consents = {
      email: true,
      analytics: false,
      version: "2026-09-23",
      language: lang,
      source: "watchtower-investor",
      lastSubmittedAt: new Date().toISOString(),
    };
    setFormStatus("sending");
    writeConsents(consents);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      let response;
      try {
        response = await fetch(config.formEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(
            buildLeadPayload({
              email,
              language: lang,
              consents,
              campaign: new URLSearchParams(window.location.search).get(
                "campaign",
              ),
            }),
          ),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) throw new Error("Request failed");
      const payload = await response.json();
      if (payload.ok !== true && payload.success !== true)
        throw new Error("Submission not confirmed");
      setFormStatus("success");
      setEmail("");
    } catch {
      setFormStatus("error");
    }
  }
  function markOptOut() {
    writeConsents({
      email: false,
      analytics: false,
      optedOutAt: new Date().toISOString(),
      language: lang,
    });
  }
  const purchaseHref = saleReady ? config.marketplaceUrl : "#waitlist";
  return (
    <>
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <header className="site-header">
        <div className="container header-inner">
          {/* The visible wordmark is the accessible name: an aria-label that
              does not contain it is a WCAG 2.5.3 failure. */}
          <a href="#top" className="logo-link">
            <Logo />
          </a>
          <nav
            className={cx("main-nav", menu && "is-open")}
            aria-label={lang === "ru" ? "Главная навигация" : "Main navigation"}
          >
            {t.nav.map((name, i) => (
              <a
                href={`#${navIds[i]}`}
                className={activeSection === navIds[i] ? "active" : ""}
                key={name}
                onClick={() => setMenu(false)}
              >
                {name}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <div className="language-switch" aria-label="Language">
              <button
                lang="ru"
                aria-pressed={lang === "ru"}
                onClick={() => changeLanguage("ru")}
              >
                RU
              </button>
              <span>/</span>
              <button
                lang="en"
                aria-pressed={lang === "en"}
                onClick={() => changeLanguage("en")}
              >
                EN
              </button>
            </div>
            <a className="button header-cta" href="#offer">
              {t.navCta}
              <ArrowUpRight size={15} />
            </a>
            <button
              className="mobile-menu icon-button"
              aria-label={menu ? t.close : t.menu}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <div className="provenance-bar">
        <div className="container provenance-inner">
          <span className="mono">
            <Database size={12} /> {config.api.base} · {config.network} ·{" "}
            {t.data.readOnly}
          </span>
          <span className="mono provenance-time">
            <Clock size={12} />
            {hub.state === "loading"
              ? t.data.loading
              : hub.state === "ready"
                ? `${t.data.updated}: ${stampUtc(report.data && report.data.generatedAt)}`
                : t.data.notUpdated}
          </span>
          <nav className="provenance-links" aria-label={t.hub.title}>
            <a href="#status">{t.hub.navLabel}</a>
            <a href="#snapshots">{t.snapshots.navLabel}</a>
            <a href="#compliance">{t.compliance.navLabel}</a>
          </nav>
        </div>
      </div>
      <main id="main">
        <section className="hero" id="top">
          <div className="hero-grid-bg" />
          <div className="container hero-inner">
            <div className="hero-copy">
              <div className="hero-eyebrow">
                <span className="status-dot" />
                {t.heroEyebrow}
              </div>
              <h1>
                <span className="sr-only">Games Watchtower — </span>
                {t.heroTitle[0]}
                <br />
                {t.heroTitle[1]}
                <br />
                <span>{t.heroAccent}</span>
              </h1>
              <h2>{t.heroSub}</h2>
              <p className="hero-description">{t.heroBody}</p>
              <div className="hero-buttons">
                <a href="#offer" className="button primary">
                  {t.heroPrimary} <span>— {money(config.price)}</span>
                  <ArrowUpRight size={18} />
                </a>
                <a href="#watchtower" className="button secondary">
                  <Play size={15} />
                  {t.heroSecondary}
                  <span className="button-note">({t.demo})</span>
                </a>
              </div>
              <p className="hero-fine">
                <Info size={12} />
                {t.heroNote}
              </p>
              <div className="hero-trust">
                <span>
                  <svg
                    width="16"
                    height="14"
                    viewBox="0 0 16 14"
                    aria-hidden="true"
                  >
                    <path
                      d="m3 1 13 0-3 3H0zM0 5h13l3 3H3zM3 10h13l-3 3H0z"
                      fill="currentColor"
                    />
                  </svg>
                  {t.onSolana}
                </span>
                <span>
                  <ShieldCheck size={15} />
                  {t.transparent}
                </span>
              </div>
            </div>
            <div className="hero-visual">
              <div className="visual-label">
                <span className="visual-line" /> ONE ECOSYSTEM. FULL VISIBILITY.
              </div>
              <div className="hero-dashboard">
                <Dashboard t={t} compact />
              </div>
              <div className="floating-share">
                <div className="floating-icon">
                  <Layers3 size={26} />
                </div>
                <div>
                  <span>ECOSYSTEM SHARE</span>
                  <strong>
                    {sharePerNft}<small>%</small>
                  </strong>
                  <p>{t.nftProfit}</p>
                </div>
                <ArrowUpRight size={21} />
                <div className="floating-bottom">
                  <span>{NUMBERS.supply.value} NFT</span>
                  <span>USDC · SOLANA</span>
                </div>
              </div>
              <div className="hero-visual-note">
                <LockKeyhole size={12} />
                {t.dashboard.preview} · read-only
              </div>
            </div>
          </div>
          <div className="container hero-bottom">
            <span>
              <span className="status-dot" />
              {t.plannedPresale}
              <b>{NUMBERS.roadmapDates.value[0]}</b>
            </span>
            <span className="mono">
              {NUMBERS.supply.value} NFT <span className="divider-slash">/</span>{" "}
              {money(config.target)}
              <a href="#ecosystem" aria-label={t.nav[0]}>
                <ArrowDown size={15} />
              </a>
            </span>
          </div>
        </section>
        <div className="stats-section">
          <div className="container">
            <div className="stats-grid">
              {["games", "channels", "operatingSystems", "supply"].map(
                (token, i) => (
                  <div key={token} className="stat">
                    <Metric
                      token={token}
                      t={t}
                      className="stat-number"
                      as="span"
                    >
                      <span>{i === 3 ? "NFT" : "↗"}</span>
                    </Metric>
                    <h3>{t.stats[i]}</h3>
                    <p>{t.statsDetail[i]}</p>
                  </div>
                ),
              )}
            </div>
            <p className="stats-note">
              <ShieldCheck size={13} />
              {t.statsNote}
            </p>
          </div>
        </div>
        <section className="section problem-section">
          <div className="container">
            <div className="problem-top">
              <div>
                <Label>{t.problemLabel}</Label>
                <h2>
                  {t.problemTitle}
                  <br />
                  <span className="green-text">{t.problemAccent}</span>
                </h2>
              </div>
              <div className="problem-copy">
                <p>{t.problemBody}</p>
                <p>{t.problemEnd}</p>
              </div>
            </div>
            <div className="problem-cards">
              {t.problemCards.map(([title, body], i) => {
                const Icon = [Eye, ScanLine, ShieldCheck][i];
                return (
                  <div key={title}>
                    <Icon size={23} />
                    <div>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        <section className="section watch-section" id="watchtower">
          <div className="container">
            <SectionHeader
              label={t.watchLabel}
              title={t.watchTitle}
              body={t.watchBody}
            >
              <Badge color="gray" dot>
                WATCHTOWER OS
              </Badge>
            </SectionHeader>
            <div className="watch-features">
              {t.watchFeatures.map(([title, body], i) => {
                const Icon = [Database, LockKeyhole, FileText][i];
                return (
                  <div key={title}>
                    <span className="feature-icon">
                      <Icon size={20} />
                    </span>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                );
              })}
            </div>
            <Dashboard t={t} />
            <p className="caption">
              <Info size={13} />
              {t.watchCaption}
            </p>
            <div className="quality-strip">
              <div>
                <ShieldCheck size={20} />
                <p>{t.watchQuote}</p>
              </div>
              <div>
                <span>{t.watchQuality}</span>
                <div className="quality-badges">
                  <Badge dot>complete</Badge>
                  <Badge color="orange" dot>
                    partial
                  </Badge>
                  <Badge color="gray" dot>
                    unavailable
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </section>
        <EcosystemStatus
          t={t}
          status={hub.ecosystem || { status: "loading" }}
          inventory={adapterInventory(hub.readModel)}
          updatedAt={hub.ecosystem && hub.ecosystem.data ? hub.ecosystem.data.generatedAt : null}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
        <section className="section games-section" id="ecosystem">
          <div className="container">
            <SectionHeader
              label={t.gamesLabel}
              title={t.gamesTitle}
              body={t.gamesBody}
            >
              <span className="section-side-note mono">
                04 GAMES <span className="green-text">/</span> SOLANA
              </span>
            </SectionHeader>
            <div className="game-grid">
              {t.games.map((g, i) => (
                <article className="game-card" key={g.name}>
                  <div className="game-image">
                    <img
                      src={`${import.meta.env.BASE_URL}images/${gameImages[i]}.webp`}
                      alt={g.name + " — " + t.concept}
                      width={418}
                      height={941}
                      loading="lazy"
                      decoding="async"
                    />
                    <Badge
                      color={g.stage === "prototype" ? "purple" : "green"}
                      dot
                    >
                      {g.stage}
                    </Badge>
                    <span className="concept-label">{t.concept}</span>
                    <div className="game-title">
                      <span>{g.genre}</span>
                      <h3>{g.name}</h3>
                    </div>
                  </div>
                  <div className="game-copy">
                    <p>{g.body}</p>
                    <div>
                      <span className="status-dot orange" />
                      {t.gameData}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="caption">
              <Info size={13} />
              {t.gamesNote}
            </p>
          </div>
        </section>
        <section className="section traffic-section" id="talkchart">
          <div className="container traffic-layout">
            <div>
              <Label>{t.trafficLabel}</Label>
              <h2>
                {t.trafficTitle}
                <br />
                <span className="purple-text">{t.trafficAccent}</span>
              </h2>
              <p className="section-intro">{t.trafficBody}</p>
              <div className="channel-list">
                {t.channels.map(([name, body], i) => {
                  const Icon = [Globe2, ArrowUpRight, Play, Activity, Wallet][
                    i
                  ];
                  return (
                    <div key={name}>
                      <span className="channel-icon">
                        <Icon size={18} />
                      </span>
                      <div>
                        <h3>{name}</h3>
                        <p>{body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="traffic-right">
              <div className="talkchart-heading">
                <span className="talkchart-logo">
                  <ChartNoAxesCombined size={25} />
                  TalkChart<span>↗</span>
                </span>
                <Badge color="purple">ACQUISITION ENGINE</Badge>
              </div>
              <Dashboard t={t} initialTab={3} />
              <div className="traffic-stat-grid">
                {["campaigns", "trafficSources", "targetPages", "adSpend"].map(
                  (token, i) => (
                    <div key={token}>
                      <strong>
                        {NUMBERS[token].unit === "USDC"
                          ? money(NUMBERS[token].value)
                          : NUMBERS[token].value}
                      </strong>
                      <span>{t.trafficStats[i]}</span>
                    </div>
                  ),
                )}
              </div>
              <p className="caption">{t.trafficNote}</p>
            </div>
          </div>
        </section>
        <section className="section offer-section" id="offer">
          <div className="container">
            <div className="offer-layout">
              <div className="offer-copy">
                <Label>{t.offerLabel}</Label>
                <h2>
                  {t.offerTitle}
                  <br />
                  <span className="muted">{t.offerAccent}</span>
                </h2>
                <p className="section-intro">{t.offerBody}</p>
                <div className="rights-list">
                  {t.rights.map(([title, body], i) => {
                    const Icon = [ChartNoAxesCombined, Wallet, LayoutDashboard][
                      i
                    ];
                    return (
                      <div key={title}>
                        <span className="feature-icon">
                          <Icon size={20} />
                        </span>
                        <div>
                          <h3>{title}</h3>
                          <p>{body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="offer-card">
                <div className="nft-art">
                  <div className="nft-art-top">
                    <Logo small />
                    <Badge color="gray">SOLANA</Badge>
                  </div>
                  <TowerArt />
                  <div className="nft-art-text">
                    <span>ECOSYSTEM SHARE</span>
                    <strong>
                      {sharePerNft}<span>%</span>
                    </strong>
                    <p>{t.nftProfit}</p>
                  </div>
                  <div className="nft-art-bottom">
                    <span>{t.nftSupply}</span>
                    <b>
                      {config.supply} {t.nftUnits}
                    </b>
                  </div>
                </div>
                <div className="offer-card-bottom">
                  <div className="offer-price">
                    <span>{t.offerPrice}</span>
                    {/* The price is a registry fact like every other figure:
                        it carries its own quality badge and trace. */}
                    <Metric
                      as="strong"
                      token="price"
                      t={t}
                      className="offer-price-value"
                      format={(v) => (
                        <>
                          {money(v)}
                          <small>USDC</small>
                        </>
                      )}
                    />
                  </div>
                  <div className="offer-limit">
                    <span>{t.offerLimit}</span>
                    <span>
                      {config.walletLimit} {t.perWallet}
                    </span>
                  </div>
                  <a
                    className="button primary full"
                    href={purchaseHref}
                    {...(saleReady
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                  >
                    {t.offerCta}
                    <ArrowUpRight size={18} />
                  </a>
                  <div className="offer-status">
                    <span className="status-dot orange" />
                    {saleReady ? t.saleLive : t.saleClosed}
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setTerms(true)}
                  >
                    <FileText size={14} />
                    {t.offerTerms}
                    <ArrowUpRight size={14} />
                  </button>
                  <p>{saleReady ? t.walletHelp : t.offerNote}</p>
                </div>
              </div>
            </div>
            <div className="payout-flow">
              <div className="payout-heading">
                <h3>{t.flowTitle}</h3>
                <Badge color="orange">{t.planned}</Badge>
              </div>
              <div className="flow-grid">
                {t.flow.map(([title, body], i) => (
                  <div key={title}>
                    <div className="flow-number">
                      <span>0{i + 1}</span>
                      {i < 3 && <ArrowRight size={17} />}
                    </div>
                    <h4>{title}</h4>
                    <p>{body}</p>
                  </div>
                ))}
              </div>
              <p className="caption">{t.flowNote}</p>
            </div>
          </div>
        </section>
        <section className="section math-section" id="math">
          <div className="container">
            <SectionHeader
              label={t.mathLabel}
              title={t.mathTitle}
              body={t.mathBody}
            />
            <div className="formula">
              <span>ƒ(x)</span>
              <code>{t.formula}</code>
              <Check size={20} />
            </div>
            <div className="scenario-label">
              <Badge color="orange">{t.scenarios}</Badge>
            </div>
            <div className="scenario-table">
              <table>
                <thead>
                  <tr>
                    {t.tableHeads.map((s) => (
                      <th scope="col" key={s}>
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {NUMBERS.scenarios.value.map((n) => {
                    const r = calculateShare(
                      n,
                      config.supply,
                      config.poolPercent,
                    );
                    return (
                      <tr key={n}>
                        {[
                          money(n),
                          money(r.pool),
                          money(r.annual),
                          money(r.quarterly, 2),
                          (r.annual / config.price) * 100 + "%",
                        ].map((v, i) => (
                          <td key={i} data-label={t.tableHeads[i]}>
                            {v}
                            {i === 2 && (
                              <span className="table-per"> / NFT</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="calculator">
              <div className="calc-input">
                <span className="mono calc-title">
                  <ChartNoAxesCombined size={16} />
                  {t.calculatorTitle}
                </span>
                <label htmlFor="profit-input">{t.calcLabel}</label>
                <div className="calc-number">
                  <span>$</span>
                  <input
                    id="profit-input"
                    type="number"
                    min="0"
                    max={NUMBERS.scenarioMax.value}
                    step={NUMBERS.calcStep.value}
                    value={annualProfit}
                    onChange={(e) =>
                      setAnnualProfit(
                        Math.min(
                          NUMBERS.scenarioMax.value,
                          Math.max(0, Number(e.target.value)),
                        ),
                      )
                    }
                  />
                </div>
                <input
                  aria-label={t.calcLabel}
                  type="range"
                  min="0"
                  max={NUMBERS.scenarioMax.value}
                  step={NUMBERS.calcStep.value}
                  value={annualProfit}
                  style={{
                    "--range-progress": `${(annualProfit / NUMBERS.scenarioMax.value) * 100}%`,
                  }}
                  onChange={(e) => setAnnualProfit(Number(e.target.value))}
                />
                <div className="range-labels">
                  <span>{money(0)}</span>
                  <span>{money(NUMBERS.scenarioMax.value)}</span>
                </div>
              </div>
              <div className="calc-result" aria-live="polite">
                <span>{t.calcAnnual}</span>
                <strong>{money(result.annual, 2)}</strong>
                <span>
                  {t.calcQuarter}: <b>{money(result.quarterly, 2)}</b>
                </span>
                <p>{t.calcNote}</p>
              </div>
            </div>
            <div className="math-notes">
              <p>
                <Info size={18} />
                <span>{t.mathNote}</span>
              </p>
              <p>{t.profitDefinition}</p>
              <p>{t.mathArgument}</p>
            </div>
            <div className="income-note">
              <span className="feature-icon">
                <Eye size={20} />
              </span>
              <div>
                <h3>{t.incomeTitle}</h3>
                <p>{t.incomeBody}</p>
              </div>
              <a href="#watchtower" aria-label={t.heroSecondary}>
                <ArrowUpRight size={22} />
              </a>
            </div>
          </div>
        </section>
        <Snapshots
          t={t}
          snapshots={{ status: snapshotsResult.status, rows: snapshotRows, data: snapshotsResult.data }}
          state={
            snapshotsResult.status === "ok"
              ? "ready"
              : snapshotsResult.status === "loading"
                ? "loading"
                : "unavailable"
          }
          reason={snapshotsResult.reason}
          updatedAt={
            snapshotsResult.status === "ok" && snapshotsResult.data
              ? snapshotsResult.data.generatedAt || null
              : null
          }
          onRetry={() => setReloadKey((key) => key + 1)}
        />
        <section className="section funds-section" id="funds">
          <div className="container">
            <SectionHeader
              label={t.fundsLabel}
              title={t.fundsTitle}
              body={t.fundsBody}
            />
            <div className="funds-layout">
              <div className="fund-chart">
                <div className="donut">
                  <div>
                    <span>{t.fundTotal}</span>
                    <strong>
                      {money(config.target / 1000, 0)}
                      <span>k</span>
                    </strong>
                    <span className="mono">USDC / SOLANA</span>
                  </div>
                </div>
                <span className="fund-chart-note">
                  <ShieldCheck size={14} />
                  {t.transparent}
                </span>
              </div>
              <div className="fund-rows">
                {t.funds.map(([name, description], i) => (
                  <div className="fund-row" key={name}>
                    <i style={{ background: fundColors[i] }} />
                    <div>
                      <h3>{name}</h3>
                      <p>{description}</p>
                    </div>
                    <div className="fund-amount">
                      <strong>{money(NUMBERS.funds.value[i])}</strong>
                      <span>{NUMBERS.fundPercents.value[i]}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="milestone-panel">
              <div className="mono milestone-label">
                <LockKeyhole size={14} />
                {t.milestoneLabel}
              </div>
              <div className="milestones">
                {NUMBERS.milestoneSplit.value.map((n, i) => (
                  <div key={n}>
                    <strong>
                      {n}
                      <span>%</span>
                    </strong>
                    <span>{t.milestones[i]}</span>
                    {i < 2 && <ArrowRight size={20} />}
                  </div>
                ))}
              </div>
              <p className="caption">{t.milestoneNote}</p>
            </div>
          </div>
        </section>
        <section className="section roadmap-section" id="roadmap">
          <div className="container">
            <SectionHeader
              label={t.roadmapLabel}
              title={t.roadmapTitle}
              body={t.roadmapBody}
            />
            <div className="roadmap-grid">
              {t.roadmap.map(([title, ...items], i) => (
                <article key={title} className={i === 0 ? "next" : ""}>
                  <div className="roadmap-date">
                    <span>{NUMBERS.roadmapDates.value[i]}</span>
                    <Badge color={i === 0 ? "green" : "gray"}>
                      {t.planned}
                    </Badge>
                  </div>
                  <div className="timeline-line">
                    <span />
                  </div>
                  <h3>{title}</h3>
                  <ul>
                    {items.map((s) => (
                      <li key={s}>
                        <span />
                        <p>{s}</p>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
            <p className="caption">
              <Info size={13} />
              {t.roadmapNote}
            </p>
          </div>
        </section>
        <Compliance t={t} saleGate={saleReady} />
        <section className="section honesty-section">
          <div className="container">
            <SectionHeader label={t.honestyLabel} title={t.honestyTitle} />
            <div className="honesty-grid">
              {t.honesty.map(([title, ...items], i) => {
                const Icon = [CheckCircle2, LoaderCircle, CircleDot][i];
                return (
                  <article
                    className={["exists", "progress", "planned"][i]}
                    key={title}
                  >
                    <div>
                      <Icon size={20} />
                      <h3>{title}</h3>
                      <span>0{i + 1}</span>
                    </div>
                    <ul>
                      {items.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
            <div className="honesty-note">
              <ShieldCheck size={22} />
              <p>{t.honestyNote}</p>
            </div>
          </div>
        </section>
        <section className="section faq-section" id="faq">
          <div className="container faq-layout">
            <div>
              <Label>{t.faqLabel}</Label>
              <h2>{t.faqTitle}</h2>
              <button className="text-button" onClick={() => setTerms(true)}>
                {t.offerTerms}
                <ArrowUpRight size={17} />
              </button>
            </div>
            <div className="faq-list">
              {t.faqs.map(([q, a], i) => (
                <details key={i}>
                  <summary>
                    <span className="faq-number">0{i + 1}</span>
                    <h3>{q}</h3>
                    <Plus size={18} />
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className="waitlist-section" id="waitlist">
          <div className="container">
            <div className="waitlist-panel">
              <div className="waitlist-orb" />
              <div className="waitlist-brand">
                <span className="brand-mark">w</span>
              </div>
              <Label>{t.finalLabel}</Label>
              <h2>{t.finalTitle}</h2>
              <p>{t.finalBody}</p>
              {saleReady ? (
                <a
                  className="button primary"
                  href={config.marketplaceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.offerCta}
                  <ArrowUpRight size={18} />
                </a>
              ) : (
                <form onSubmit={submit} className="waitlist-form">
                  <label className="sr-only" htmlFor="email">
                    {t.emailLabel}
                  </label>
                  {/* Honeypot: hidden from users and assistive tech, filled only by bots. */}
                  <div className="hp-field" aria-hidden="true">
                    <label htmlFor="company-website">Company website</label>
                    <input
                      id="company-website"
                      name="company-website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={trapField}
                      onChange={(e) => setTrapField(e.target.value)}
                    />
                  </div>
                  <div className="email-field">
                    <Mail size={18} />
                    <input
                      id="email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      placeholder={t.emailPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={
                        !config.formEndpoint ||
                        formStatus === "sending" ||
                        formStatus === "success"
                      }
                    />
                    <button
                      className="button primary"
                      type="submit"
                      disabled={
                        !config.formEndpoint ||
                        formStatus === "sending" ||
                        formStatus === "success"
                      }
                    >
                      {formStatus === "sending" ? t.sending : t.join}
                      {formStatus === "sending" ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                    </button>
                  </div>
                  <p className="form-note">
                    {config.formEndpoint ? t.formConsent : t.formSoon}
                  </p>
                  <div
                    role="status"
                    aria-live="polite"
                    className={cx(
                      "form-status",
                      formStatus === "success" && "green-text",
                    )}
                  >
                    {formStatus === "success"
                      ? t.formSuccess
                      : formStatus === "error"
                        ? t.formError
                        : formStatus === "unavailable"
                          ? t.formUnavailable
                          : formStatus === "cooldown"
                            ? t.formCooldown
                            : ""}
                  </div>
                  <p className="consent-journal mono">
                    <ShieldCheck size={12} /> {t.consentSaved}{" "}
                    <button type="button" className="text-button" onClick={markOptOut}>
                      {t.optOut}
                    </button>
                  </p>
                </form>
              )}
              <div className="waitlist-contact">
                {config.contactUrl ? (
                  <a href={config.contactUrl} target="_blank" rel="noreferrer">
                    {t.contact}
                    <ArrowUpRight size={15} />
                  </a>
                ) : (
                  <button
                    onClick={() => setContactNote(!contactNote)}
                    aria-expanded={contactNote}
                  >
                    {t.contact}
                    <ArrowUpRight size={15} />
                  </button>
                )}
                {contactNote && (
                  <p className="contact-note" role="status">
                    {t.contactSoon}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <div>
              <a href="#top" className="logo-link">
                <Logo />
              </a>
              <p>{t.footerNote}</p>
            </div>
            <div className="footer-links">
              <span className="mono">LEO GAMES STUDIO</span>
              <a href="#status">{t.hub.navLabel}</a>
              <a href="#snapshots">{t.snapshots.navLabel}</a>
              <a href="#compliance">{t.compliance.navLabel}</a>
              <a href="#faq">{t.faqTitle}</a>
              <button className="text-button" onClick={() => setTerms(true)}>
                {t.offerTerms}
                <ArrowUpRight size={14} />
              </button>
            </div>
            <a href="#top" className="back-top">
              {t.top}
              <ArrowUp size={17} />
            </a>
          </div>
          <div className="legal">
            <h3>{t.legalTitle}</h3>
            <p>{t.legal}</p>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Leo Games Studio. {t.footerRights}</span>
            <span>
              <span className="status-dot" /> BUILT FOR TRANSPARENCY
            </span>
          </div>
        </div>
      </footer>
      {terms && <TermsModal t={t} onClose={termsClose} />}
    </>
  );
}
/**
 * The app renders itself only in a browser: the node smoke test
 * (`tests/render.test.js`) imports this module through Vite's SSR loader and
 * renders the components directly.
 */
const mountNode =
  typeof document === "undefined" ? null : document.getElementById("root");
if (mountNode) {
  createRoot(mountNode).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

export {
  App,
  Dashboard,
  Metric,
  QualityBadge,
  DataStateBar,
  EcosystemStatus,
  Snapshots,
  Compliance,
  calculateShare,
};
