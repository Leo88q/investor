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
} from "lucide-react";
import { content } from "./content";
import { config, saleReady } from "./config";
import { calculateShare, getLanguage, money } from "./math";
import "./styles.css";

const navIds = ["ecosystem", "watchtower", "math", "roadmap"];
const gameImages = ["ares", "farming", "neon", "guttercaps"];
const fundAmounts = [30000, 25000, 25000, 15000, 5000];
const fundColors = ["#37e5a0", "#a78bfa", "#71b8d1", "#ffb85c", "#637087"];
const cx = (...classes) => classes.filter(Boolean).join(" ");
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

function Dashboard({ t, compact = false, initialTab = 0, onTabChange }) {
  const [tab, setTab] = useState(initialTab);
  const [expanded, setExpanded] = useState(false);
  const uid = useId();
  const d = t.dashboard;
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
                    <strong>
                      4 <small>games</small>
                    </strong>
                    <em>
                      <i />
                      {d.integration}
                    </em>
                  </div>
                  <div>
                    <span>{d.sources}</span>
                    <strong>
                      8 <small>sources</small>
                    </strong>
                    <em>
                      <i />
                      {d.integration}
                    </em>
                  </div>
                  <div>
                    <span>{d.profit}</span>
                    <strong className="dash-empty">—</strong>
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
                  {t.games.map((g, i) => (
                    <div key={g.name}>
                      <span>
                        <i style={{ background: fundColors[i] }} />
                        {g.name}
                      </span>
                      <span
                        className={
                          g.stage === "prototype" ? "purple-text" : "green-text"
                        }
                      >
                        {g.stage}
                      </span>
                      <span className="quality-label">unavailable</span>
                    </div>
                  ))}
                </div>
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
                  {d.funnelStages.map((name, i) => (
                    <div key={name} style={{ width: `${100 - i * 17}%` }}>
                      <span>{name}</span>
                      <b>—</b>
                    </div>
                  ))}
                </div>
                <p className="chart-caption">{d.funnelNote}</p>
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
                      0.25<small>%</small>
                    </strong>
                    <p>{t.nftProfit}</p>
                  </div>
                  <LockKeyhole size={46} />
                </div>
                {[d.report, d.snapshots].map((s) => (
                  <div className="dash-report" key={s}>
                    <span>
                      <FileText size={16} />
                      {s}
                    </span>
                    <span>—</span>
                  </div>
                ))}
                <p className="chart-caption">{d.investorNote}</p>
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
                  {[5, 8, 6].map((v, i) => (
                    <div key={i}>
                      <strong>{v}</strong>
                      <span>{t.trafficStats[i]}</span>
                    </div>
                  ))}
                </div>
                {[
                  "SEO / GEO",
                  "X / Blinks",
                  "Shorts / TikTok / Reels",
                  "Whale radar",
                  "TipLink",
                ].map((s) => (
                  <div className="dash-report" key={s}>
                    <span>
                      <CircleDot size={12} />
                      {s}
                    </span>
                    <span className="quality-label">unavailable</span>
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
        <span>{d.noLive}</span>
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
  const [annualProfit, setAnnualProfit] = useState(200000);
  const [email, setEmail] = useState("");
  const [formStatus, setFormStatus] = useState("idle");
  const [activeSection, setActiveSection] = useState("");
  const t = content[lang];
  const result = calculateShare(
    annualProfit,
    config.supply,
    config.poolPercent,
  );
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
    document.querySelector('meta[name="description"]').content =
      t.metaDescription;
    document.querySelector('meta[property="og:title"]').content = t.metaTitle;
    document.querySelector('meta[property="og:description"]').content =
      t.metaDescription;
    document.querySelector('meta[property="og:locale"]').content =
      lang === "ru" ? "ru_RU" : "en_US";
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
  function changeLanguage(l) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", l);
    window.history.pushState({}, "", url);
    setLang(l);
    setMenu(false);
  }
  async function submit(e) {
    e.preventDefault();
    if (!config.formEndpoint) {
      setFormStatus("unavailable");
      return;
    }
    setFormStatus("sending");
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
          body: JSON.stringify({
            email,
            language: lang,
            source: "watchtower-investor",
          }),
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
  const purchaseHref = saleReady ? config.marketplaceUrl : "#waitlist";
  return (
    <>
      <a className="skip-link" href="#main">
        {t.skip}
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <a href="#" className="logo-link" aria-label="Watchtower">
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
                    0.25<small>%</small>
                  </strong>
                  <p>{t.nftProfit}</p>
                </div>
                <ArrowUpRight size={21} />
                <div className="floating-bottom">
                  <span>100 NFT</span>
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
              <b>Q4 2026</b>
            </span>
            <span className="mono">
              100 NFT <span className="divider-slash">/</span>{" "}
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
              {["4", "6", "1", "100"].map((n, i) => (
                <div key={n} className="stat">
                  <span className="stat-number">
                    {n}
                    <span>{i === 3 ? "NFT" : "↗"}</span>
                  </span>
                  <h3>{t.stats[i]}</h3>
                  <p>{t.statsDetail[i]}</p>
                </div>
              ))}
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
                      loading="lazy"
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
                {["5", "8", "6", "$0"].map((v, i) => (
                  <div key={v}>
                    <strong>{v}</strong>
                    <span>{t.trafficStats[i]}</span>
                  </div>
                ))}
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
                      0.25<span>%</span>
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
                    <strong>
                      {money(config.price)}
                      <small>USDC</small>
                    </strong>
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
                  {[100000, 200000, 400000].map((n) => {
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
                    max="1000000"
                    step="1000"
                    value={annualProfit}
                    onChange={(e) =>
                      setAnnualProfit(
                        Math.min(1000000, Math.max(0, Number(e.target.value))),
                      )
                    }
                  />
                </div>
                <input
                  aria-label={t.calcLabel}
                  type="range"
                  min="0"
                  max="1000000"
                  step="1000"
                  value={annualProfit}
                  style={{ "--range-progress": `${annualProfit / 10000}%` }}
                  onChange={(e) => setAnnualProfit(Number(e.target.value))}
                />
                <div className="range-labels">
                  <span>$0</span>
                  <span>$1,000,000</span>
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
                      $100<span>k</span>
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
                      <strong>{money(fundAmounts[i])}</strong>
                      <span>{fundAmounts[i] / 1000}%</span>
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
                {["50", "30", "20"].map((n, i) => (
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
                    <span>{["Q4 2026", "Q1 2027", "Q2 2027"][i]}</span>
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
                          : ""}
                  </div>
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
            <div>
              <span className="mono">LEO GAMES STUDIO</span>
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
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
