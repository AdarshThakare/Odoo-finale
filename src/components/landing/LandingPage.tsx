"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   LANDING PAGE — EmPay Smart HRMS
   Aesthetic direction: Midnight Finance
   Fonts: Bebas Neue (impact) · Cormorant Garamond (luxury) · DM Sans (body)
───────────────────────────────────────────────────────────────────────────── */

const TICKER_ITEMS = [
  "SMART PAYROLL",
  "LEAVE MANAGEMENT",
  "ATTENDANCE TRACKING",
  "ROLE-BASED ACCESS",
  "AUTO PAYSLIPS",
  "REAL-TIME ANALYTICS",
  "SALARY STRUCTURES",
  "ONBOARDING EMAILS",
  "PF & TAX COMPUTATION",
  "MULTI-ROLE WORKFLOWS",
];

const FEATURES = [
  {
    icon: "◈",
    label: "Payroll Engine",
    desc: "Automated salary computation with prorated attendance, PF, professional tax, and custom deductions — all in one run.",
    accent: "#F2A626",
    span: "col-span-2",
  },
  {
    icon: "◉",
    label: "Attendance",
    desc: "Check-in / check-out with working-hours derivation and monthly calendar heatmaps.",
    accent: "#7C3AED",
    span: "col-span-1",
  },
  {
    icon: "⟐",
    label: "Leave Management",
    desc: "Full lifecycle: types, allocations, applications, approval workflows, ledger audit trail.",
    accent: "#10B981",
    span: "col-span-1",
  },
  {
    icon: "⬡",
    label: "Role-Based Access",
    desc: "Four distinct roles — Admin, HR Officer, Payroll Officer, Employee — with granular permission matrices.",
    accent: "#F2A626",
    span: "col-span-1",
  },
  {
    icon: "◫",
    label: "Dashboard Analytics",
    desc: "Live charts: attendance trends, leave distribution, payroll cost history, department headcount.",
    accent: "#7C3AED",
    span: "col-span-2",
  },
];

const STATS = [
  { value: 4, suffix: "", label: "User roles with granular permissions" },
  { value: 100, suffix: "%", label: "Attendance-driven payroll accuracy" },
  { value: 6, suffix: "+", label: "Integrated HRMS modules" },
  { value: 0, suffix: "ms", label: "Manual calculation overhead" },
];

/* ─── Counter hook ───────────────────────────────────────────────────────── */
function useCounter(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            setCount(Math.round(target * ease));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);

  return { count, ref };
}

function StatCounter({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix: string;
  label: string;
}) {
  const { count, ref } = useCounter(value);
  return (
    <div ref={ref} className="emp-stat">
      <span className="emp-stat-num">
        {count}
        {suffix}
      </span>
      <span className="emp-stat-label">{label}</span>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function LandingPage() {
  return (
    <>
      {/* ─── Global styles injected into head via style tag ──────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:      #050508;
          --surf:    #0D0D14;
          --surf-hi: #15151F;
          --border:  rgba(255,255,255,0.07);
          --amber:   #F2A626;
          --amber-d: #C4841A;
          --purple:  #7C3AED;
          --green:   #10B981;
          --text:    #F0EDE6;
          --muted:   #6E6E82;
          --bebas:   'Bebas Neue', sans-serif;
          --corm:    'Cormorant Garamond', Georgia, serif;
          --dm:      'DM Sans', system-ui, sans-serif;
        }

        html { scroll-behavior: smooth; }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--dm);
          font-weight: 400;
          line-height: 1.6;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ── Noise overlay ────────────────────────────────────────────────── */
        .emp-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 128px;
          opacity: 0.028;
          pointer-events: none;
          z-index: 9999;
        }

        /* ── Nav ──────────────────────────────────────────────────────────── */
        .emp-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 2.5rem;
          border-bottom: 1px solid var(--border);
          background: rgba(5, 5, 8, 0.72);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .emp-nav-logo {
          font-family: var(--bebas);
          font-size: 1.75rem;
          letter-spacing: 0.06em;
          color: var(--text);
          text-decoration: none;
        }
        .emp-nav-logo span { color: var(--amber); }
        .emp-nav-links {
          display: flex;
          align-items: center;
          gap: 2rem;
          list-style: none;
        }
        .emp-nav-links a {
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
          text-decoration: none;
          transition: color 0.2s;
        }
        .emp-nav-links a:hover { color: var(--text); }
        .emp-nav-cta {
          background: var(--amber);
          color: #000;
          font-family: var(--dm);
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 0.55rem 1.4rem;
          border-radius: 0.25rem;
          transition: background 0.2s, transform 0.15s;
        }
        .emp-nav-cta:hover { background: #ffd080; transform: translateY(-1px); }

        /* ── Hero ─────────────────────────────────────────────────────────── */
        .emp-hero {
          min-height: 100svh;
          display: grid;
          grid-template-columns: 1fr;
          align-items: center;
          position: relative;
          overflow: hidden;
          padding: 8rem 2.5rem 6rem;
        }

        /* Orb mesh */
        .emp-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .emp-orb-1 {
          width: 55vw;
          height: 55vw;
          background: radial-gradient(circle, rgba(242,166,38,0.18) 0%, transparent 65%);
          top: -15%;
          right: -10%;
          animation: orbFloat1 14s ease-in-out infinite alternate;
        }
        .emp-orb-2 {
          width: 40vw;
          height: 40vw;
          background: radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 65%);
          bottom: 5%;
          left: -8%;
          animation: orbFloat2 18s ease-in-out infinite alternate;
        }
        .emp-orb-3 {
          width: 25vw;
          height: 25vw;
          background: radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 65%);
          top: 40%;
          left: 40%;
          animation: orbFloat1 22s ease-in-out infinite alternate-reverse;
        }
        @keyframes orbFloat1 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(4%, 6%) scale(1.08); }
        }
        @keyframes orbFloat2 {
          from { transform: translate(0, 0) scale(1.04); }
          to   { transform: translate(-3%, -4%) scale(0.96); }
        }

        /* Grid lines */
        .emp-hero::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        .emp-hero-inner {
          position: relative;
          z-index: 2;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        .emp-hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--amber);
          margin-bottom: 1.5rem;
        }
        .emp-hero-eyebrow::before {
          content: '';
          display: block;
          width: 1.5rem;
          height: 1px;
          background: var(--amber);
        }

        .emp-hero-h1 {
          font-family: var(--bebas);
          font-size: clamp(4.5rem, 8vw, 8.5rem);
          line-height: 0.9;
          letter-spacing: 0.02em;
          color: var(--text);
          margin-bottom: 0.3rem;
        }
        .emp-hero-h1-accent {
          display: block;
          color: var(--amber);
          font-family: var(--bebas);
        }
        .emp-hero-h1-italic {
          display: block;
          font-family: var(--corm);
          font-style: italic;
          font-weight: 400;
          font-size: clamp(3rem, 5.5vw, 5.5rem);
          color: rgba(240,237,230,0.55);
          letter-spacing: 0.01em;
          line-height: 1.1;
        }

        .emp-hero-sub {
          font-size: 1rem;
          color: var(--muted);
          line-height: 1.7;
          max-width: 36ch;
          margin: 1.8rem 0 2.5rem;
        }

        .emp-hero-ctas {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .emp-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--amber);
          color: #000;
          font-weight: 700;
          font-size: 0.82rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 0.85rem 2rem;
          border-radius: 0.25rem;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }
        .emp-btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 60%, rgba(255,255,255,0.2));
          transform: translateX(-100%);
          transition: transform 0.4s;
        }
        .emp-btn-primary:hover { background: #ffd080; transform: translateY(-2px); box-shadow: 0 12px 40px rgba(242,166,38,0.35); }
        .emp-btn-primary:hover::after { transform: translateX(0); }

        .emp-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text);
          font-weight: 500;
          font-size: 0.82rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          text-decoration: none;
          padding: 0.85rem 2rem;
          border-radius: 0.25rem;
          border: 1px solid var(--border);
          transition: all 0.2s;
          background: transparent;
        }
        .emp-btn-ghost:hover { border-color: rgba(255,255,255,0.25); background: var(--surf-hi); }

        /* ── Dashboard card ────────────────────────────────────────────────── */
        .emp-hero-card {
          position: relative;
          perspective: 1200px;
        }
        .emp-dash-preview {
          background: var(--surf);
          border: 1px solid var(--border);
          border-radius: 1rem;
          overflow: hidden;
          box-shadow:
            0 2px 0 rgba(255,255,255,0.05) inset,
            0 40px 80px rgba(0,0,0,0.8),
            0 0 0 1px rgba(255,255,255,0.04);
          transform: rotateY(-6deg) rotateX(3deg) translateY(-16px);
          animation: dashFloat 8s ease-in-out infinite alternate;
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .emp-dash-preview:hover {
          transform: rotateY(-2deg) rotateX(1deg) translateY(-8px) scale(1.01);
        }
        @keyframes dashFloat {
          from { transform: rotateY(-6deg) rotateX(3deg) translateY(-16px); }
          to   { transform: rotateY(-4deg) rotateX(1deg) translateY(-8px); }
        }

        .emp-dash-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.9rem 1.2rem;
          border-bottom: 1px solid var(--border);
          background: var(--surf-hi);
        }
        .emp-dash-dots { display: flex; gap: 0.4rem; }
        .emp-dash-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
        }

        .emp-dash-body { padding: 1.2rem; display: flex; flex-direction: column; gap: 1rem; }

        .emp-dash-stat-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }
        .emp-dash-stat {
          background: var(--surf-hi);
          border: 1px solid var(--border);
          border-radius: 0.6rem;
          padding: 0.85rem;
        }
        .emp-dash-stat-label {
          font-size: 0.6rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 0.3rem;
        }
        .emp-dash-stat-val {
          font-family: var(--bebas);
          font-size: 1.4rem;
          letter-spacing: 0.04em;
          line-height: 1;
        }

        .emp-dash-chart-bar {
          background: var(--surf-hi);
          border: 1px solid var(--border);
          border-radius: 0.6rem;
          padding: 0.85rem;
        }
        .emp-dash-chart-label {
          font-size: 0.6rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 0.8rem;
        }
        .emp-bars {
          display: flex;
          align-items: flex-end;
          gap: 0.35rem;
          height: 60px;
        }
        .emp-bar {
          flex: 1;
          border-radius: 3px 3px 0 0;
          background: var(--amber);
          opacity: 0.85;
          transition: opacity 0.2s;
        }
        .emp-bar:hover { opacity: 1; }
        .emp-bar-alt { background: var(--purple); }

        .emp-dash-pills {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .emp-dash-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.62rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          border: 1px solid;
        }
        .emp-dash-pill-green { color: #10B981; border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.08); }
        .emp-dash-pill-amber { color: #F2A626; border-color: rgba(242,166,38,0.3); background: rgba(242,166,38,0.08); }
        .emp-dash-pill-purple { color: #7C3AED; border-color: rgba(124,58,237,0.3); background: rgba(124,58,237,0.08); }

        /* ── Ticker ────────────────────────────────────────────────────────── */
        .emp-ticker {
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          overflow: hidden;
          padding: 0;
          background: var(--surf);
          position: relative;
        }
        .emp-ticker-track {
          display: flex;
          width: max-content;
          animation: ticker 30s linear infinite;
        }
        .emp-ticker:hover .emp-ticker-track { animation-play-state: paused; }
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .emp-ticker-item {
          display: inline-flex;
          align-items: center;
          gap: 1.2rem;
          padding: 1rem 2rem;
          font-family: var(--bebas);
          font-size: 1rem;
          letter-spacing: 0.12em;
          color: var(--muted);
          white-space: nowrap;
          transition: color 0.2s;
        }
        .emp-ticker-item:hover { color: var(--amber); }
        .emp-ticker-sep {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--amber);
          opacity: 0.5;
        }

        /* ── Features ─────────────────────────────────────────────────────── */
        .emp-section {
          padding: 7rem 2.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .emp-section-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--amber);
          margin-bottom: 1.2rem;
        }
        .emp-section-tag::before {
          content: '';
          display: block;
          width: 1.5rem;
          height: 1px;
          background: var(--amber);
        }

        .emp-section-h2 {
          font-family: var(--bebas);
          font-size: clamp(3rem, 5vw, 5.5rem);
          line-height: 0.92;
          letter-spacing: 0.02em;
          color: var(--text);
          max-width: 18ch;
        }
        .emp-section-h2 em {
          font-family: var(--corm);
          font-style: italic;
          font-weight: 400;
          font-size: 0.75em;
          color: rgba(240,237,230,0.5);
          display: block;
          line-height: 1.2;
        }

        .emp-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 1rem;
          overflow: hidden;
          margin-top: 4rem;
        }

        .emp-feature-card {
          background: var(--surf);
          padding: 2.2rem;
          position: relative;
          overflow: hidden;
          transition: background 0.3s;
          cursor: default;
        }
        .emp-feature-card.emp-wide { grid-column: span 2; }
        .emp-feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent-color, var(--amber)), transparent);
          opacity: 0;
          transition: opacity 0.4s;
        }
        .emp-feature-card:hover { background: var(--surf-hi); }
        .emp-feature-card:hover::before { opacity: 1; }

        .emp-feature-icon {
          font-size: 1.8rem;
          margin-bottom: 1.2rem;
          display: block;
          line-height: 1;
        }
        .emp-feature-title {
          font-family: var(--bebas);
          font-size: 1.6rem;
          letter-spacing: 0.04em;
          color: var(--text);
          margin-bottom: 0.6rem;
        }
        .emp-feature-desc {
          font-size: 0.85rem;
          color: var(--muted);
          line-height: 1.7;
          max-width: 38ch;
        }

        .emp-feature-badge {
          position: absolute;
          bottom: 1.5rem;
          right: 1.5rem;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          border: 1px solid currentColor;
          opacity: 0.5;
          transition: opacity 0.3s;
        }
        .emp-feature-card:hover .emp-feature-badge { opacity: 1; }

        /* ── Stats ────────────────────────────────────────────────────────── */
        .emp-stats-band {
          background: var(--surf);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .emp-stats-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 5rem 2.5rem;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
        }
        .emp-stat {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          position: relative;
        }
        .emp-stat + .emp-stat::before {
          content: '';
          position: absolute;
          left: -1rem;
          top: 10%;
          bottom: 10%;
          width: 1px;
          background: var(--border);
        }
        .emp-stat-num {
          font-family: var(--bebas);
          font-size: clamp(3.5rem, 5vw, 5.5rem);
          letter-spacing: 0.02em;
          line-height: 1;
          background: linear-gradient(135deg, var(--amber), #fff8ed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .emp-stat-label {
          font-size: 0.82rem;
          color: var(--muted);
          line-height: 1.5;
          max-width: 18ch;
        }

        /* ── Modules showcase ─────────────────────────────────────────────── */
        .emp-modules {
          padding: 7rem 2.5rem;
        }
        .emp-modules-inner {
          max-width: 1200px;
          margin: 0 auto;
        }
        .emp-modules-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          margin-top: 4rem;
        }
        .emp-module-card {
          background: var(--surf);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 2.5rem;
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
          transition: border-color 0.3s, transform 0.3s;
          cursor: default;
        }
        .emp-module-card:hover {
          border-color: rgba(242,166,38,0.3);
          transform: translateY(-3px);
        }
        .emp-module-num {
          font-family: var(--bebas);
          font-size: 3rem;
          letter-spacing: 0.04em;
          line-height: 1;
          color: rgba(242,166,38,0.2);
          min-width: 2.5rem;
          transition: color 0.3s;
        }
        .emp-module-card:hover .emp-module-num { color: rgba(242,166,38,0.5); }
        .emp-module-content {}
        .emp-module-title {
          font-family: var(--bebas);
          font-size: 1.5rem;
          letter-spacing: 0.06em;
          color: var(--text);
          margin-bottom: 0.5rem;
        }
        .emp-module-desc {
          font-size: 0.82rem;
          color: var(--muted);
          line-height: 1.65;
        }
        .emp-module-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-top: 1rem;
        }
        .emp-module-chip {
          font-size: 0.62rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--amber);
          background: rgba(242,166,38,0.08);
          border: 1px solid rgba(242,166,38,0.2);
          padding: 0.2rem 0.55rem;
          border-radius: 0.2rem;
        }

        /* ── Quote ────────────────────────────────────────────────────────── */
        .emp-quote-section {
          padding: 5rem 2.5rem;
          text-align: center;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          background: var(--surf);
          position: relative;
          overflow: hidden;
        }
        .emp-quote-section::before {
          content: '"';
          position: absolute;
          top: -2rem;
          left: 50%;
          transform: translateX(-50%);
          font-family: var(--corm);
          font-size: 20rem;
          color: rgba(242,166,38,0.04);
          line-height: 1;
          pointer-events: none;
          user-select: none;
        }
        .emp-quote-text {
          font-family: var(--corm);
          font-style: italic;
          font-size: clamp(2rem, 4vw, 3.5rem);
          line-height: 1.25;
          color: var(--text);
          max-width: 22ch;
          margin: 0 auto;
          position: relative;
        }
        .emp-quote-text span { color: var(--amber); }
        .emp-quote-attr {
          margin-top: 2rem;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--muted);
        }

        /* ── CTA section ──────────────────────────────────────────────────── */
        .emp-cta-section {
          padding: 8rem 2.5rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .emp-cta-section::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60vw;
          height: 60vw;
          background: radial-gradient(circle, rgba(242,166,38,0.08) 0%, transparent 65%);
          pointer-events: none;
        }
        .emp-cta-inner { position: relative; }
        .emp-cta-h2 {
          font-family: var(--bebas);
          font-size: clamp(4rem, 7vw, 8rem);
          letter-spacing: 0.02em;
          line-height: 0.9;
          color: var(--text);
          margin-bottom: 1.5rem;
        }
        .emp-cta-h2 span { color: var(--amber); }
        .emp-cta-sub {
          font-size: 1rem;
          color: var(--muted);
          max-width: 40ch;
          margin: 0 auto 3rem;
          line-height: 1.7;
        }
        .emp-cta-btns {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        /* ── Footer ───────────────────────────────────────────────────────── */
        .emp-footer {
          border-top: 1px solid var(--border);
          padding: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .emp-footer-logo {
          font-family: var(--bebas);
          font-size: 1.4rem;
          letter-spacing: 0.06em;
          color: var(--text);
        }
        .emp-footer-logo span { color: var(--amber); }
        .emp-footer-copy {
          font-size: 0.75rem;
          color: var(--muted);
        }
        .emp-footer-links {
          display: flex;
          gap: 1.5rem;
          list-style: none;
        }
        .emp-footer-links a {
          font-size: 0.75rem;
          color: var(--muted);
          text-decoration: none;
          transition: color 0.2s;
        }
        .emp-footer-links a:hover { color: var(--text); }

        /* ── Entrance animations ──────────────────────────────────────────── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .emp-fadein { animation: fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .emp-fadein-1 { animation-delay: 0.05s; }
        .emp-fadein-2 { animation-delay: 0.15s; }
        .emp-fadein-3 { animation-delay: 0.28s; }
        .emp-fadein-4 { animation-delay: 0.42s; }
        .emp-fadein-5 { animation-delay: 0.58s; }

        /* ── Responsive ───────────────────────────────────────────────────── */
        @media (max-width: 900px) {
          .emp-hero-inner { grid-template-columns: 1fr; gap: 3rem; }
          .emp-hero-card { display: none; }
          .emp-stats-inner { grid-template-columns: repeat(2, 1fr); }
          .emp-stat + .emp-stat::before { display: none; }
          .emp-features-grid { grid-template-columns: 1fr; }
          .emp-feature-card.emp-wide { grid-column: span 1; }
          .emp-modules-grid { grid-template-columns: 1fr; }
          .emp-nav-links { display: none; }
        }
        @media (max-width: 600px) {
          .emp-hero { padding: 7rem 1.5rem 4rem; }
          .emp-section { padding: 4rem 1.5rem; }
          .emp-stats-inner { grid-template-columns: 1fr 1fr; padding: 3rem 1.5rem; }
          .emp-footer { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <div className="emp-root">
        {/* ── NAV ──────────────────────────────────────────────────────────── */}
        <nav className="emp-nav">
          <a href="#" className="emp-nav-logo">
            Em<span>Pay</span>
          </a>
          <ul className="emp-nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#modules">Modules</a></li>
            <li><a href="#about">About</a></li>
          </ul>
          <Link href="/register" className="emp-nav-cta">
            Get Started
          </Link>
        </nav>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="emp-hero">
          <div className="emp-orb emp-orb-1" />
          <div className="emp-orb emp-orb-2" />
          <div className="emp-orb emp-orb-3" />

          <div className="emp-hero-inner">
            {/* Left: copy */}
            <div>
              <p className="emp-hero-eyebrow emp-fadein emp-fadein-1">
                Smart HRMS Platform
              </p>
              <h1 className="emp-hero-h1 emp-fadein emp-fadein-2">
                <span className="emp-hero-h1-accent">Payroll.</span>
                People.
                <span className="emp-hero-h1-italic">Performance.</span>
              </h1>
              <p className="emp-hero-sub emp-fadein emp-fadein-3">
                EmPay unifies attendance, leave, payroll, and analytics into one
                beautifully engineered platform — built for the organisations
                that refuse to compromise.
              </p>
              <div className="emp-hero-ctas emp-fadein emp-fadein-4">
                <Link href="/register" className="emp-btn-primary">
                  Start for free →
                </Link>
                <Link href="/login" className="emp-btn-ghost">
                  Sign in
                </Link>
              </div>
            </div>

            {/* Right: dashboard preview */}
            <div className="emp-hero-card emp-fadein emp-fadein-5">
              <div className="emp-dash-preview">
                {/* Topbar */}
                <div className="emp-dash-topbar">
                  <div className="emp-dash-dots">
                    <div className="emp-dash-dot" style={{ background: "#FF5F57" }} />
                    <div className="emp-dash-dot" style={{ background: "#FEBC2E" }} />
                    <div className="emp-dash-dot" style={{ background: "#28C840" }} />
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.75rem", letterSpacing: "0.12em", color: "var(--muted)" }}>
                    EMPAY DASHBOARD
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <div className="emp-dash-pill emp-dash-pill-green">● Live</div>
                  </div>
                </div>

                {/* Body */}
                <div className="emp-dash-body">
                  {/* Stat row */}
                  <div className="emp-dash-stat-row">
                    <div className="emp-dash-stat">
                      <div className="emp-dash-stat-label">Headcount</div>
                      <div className="emp-dash-stat-val" style={{ color: "var(--amber)" }}>48</div>
                    </div>
                    <div className="emp-dash-stat">
                      <div className="emp-dash-stat-label">Present Today</div>
                      <div className="emp-dash-stat-val" style={{ color: "var(--green)" }}>41</div>
                    </div>
                    <div className="emp-dash-stat">
                      <div className="emp-dash-stat-label">On Leave</div>
                      <div className="emp-dash-stat-val" style={{ color: "var(--purple)" }}>7</div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="emp-dash-chart-bar">
                    <div className="emp-dash-chart-label">Payroll Cost — Last 6 Months</div>
                    <div className="emp-bars">
                      {[55, 72, 63, 88, 75, 92].map((h, i) => (
                        <div
                          key={i}
                          className={`emp-bar ${i % 2 === 1 ? "emp-bar-alt" : ""}`}
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Payrun row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div className="emp-dash-stat-label" style={{ marginBottom: "0.2rem" }}>Last Payrun</div>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", letterSpacing: "0.06em", color: "var(--text)" }}>
                        April 2026
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="emp-dash-stat-label" style={{ marginBottom: "0.2rem" }}>Net Payout</div>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", letterSpacing: "0.04em", color: "var(--amber)" }}>
                        ₹24,80,000
                      </div>
                    </div>
                  </div>

                  {/* Status pills */}
                  <div className="emp-dash-pills">
                    <div className="emp-dash-pill emp-dash-pill-green">✓ Payroll Run</div>
                    <div className="emp-dash-pill emp-dash-pill-amber">3 Leave Pending</div>
                    <div className="emp-dash-pill emp-dash-pill-purple">PF Computed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TICKER ───────────────────────────────────────────────────────── */}
        <div className="emp-ticker">
          <div className="emp-ticker-track">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className="emp-ticker-item">
                {item}
                <span className="emp-ticker-sep" />
              </span>
            ))}
          </div>
        </div>

        {/* ── FEATURES ─────────────────────────────────────────────────────── */}
        <section id="features" className="emp-section">
          <p className="emp-section-tag">Why EmPay</p>
          <h2 className="emp-section-h2">
            Built for the
            <br />
            modern
            <em>workforce</em>
          </h2>

          <div className="emp-features-grid">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={`emp-feature-card ${f.span === "col-span-2" ? "emp-wide" : ""}`}
                style={{ "--accent-color": f.accent } as React.CSSProperties}
              >
                <span
                  className="emp-feature-icon"
                  style={{ color: f.accent }}
                >
                  {f.icon}
                </span>
                <div className="emp-feature-title">{f.label}</div>
                <p className="emp-feature-desc">{f.desc}</p>
                <span
                  className="emp-feature-badge"
                  style={{ color: f.accent }}
                >
                  Core
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── STATS BAND ───────────────────────────────────────────────────── */}
        <div className="emp-stats-band">
          <div className="emp-stats-inner">
            {STATS.map((s, i) => (
              <StatCounter key={i} value={s.value} suffix={s.suffix} label={s.label} />
            ))}
          </div>
        </div>

        {/* ── MODULES ──────────────────────────────────────────────────────── */}
        <section id="modules" className="emp-modules">
          <div className="emp-modules-inner">
            <p className="emp-section-tag">Platform Modules</p>
            <h2 className="emp-section-h2">
              Every module,
              <em>perfectly connected</em>
            </h2>

            <div className="emp-modules-grid">
              {[
                {
                  title: "User & Role Management",
                  desc: "Four roles with distinct capabilities. Admin bootstraps the company, HR creates employees with auto-generated login credentials and onboarding emails, Payroll runs the numbers.",
                  chips: ["Admin", "HR Officer", "Payroll Officer", "Employee"],
                },
                {
                  title: "Attendance & Check-In",
                  desc: "Employees clock in and out with precise timestamps. The system computes working hours, derives Present/Half-Day/Absent status, and feeds directly into the payroll engine.",
                  chips: ["Check-In/Out", "Working Hours", "Status Derivation"],
                },
                {
                  title: "Leave Management",
                  desc: "Configurable leave types, annual allocations, application workflows with approval queues, leave ledger for full audit history, and automatic attendance sync on approval.",
                  chips: ["Allocations", "Approval Workflow", "Ledger Audit"],
                },
                {
                  title: "Payroll Engine",
                  desc: "Attendance-driven salary computation with prorated basic/HRA, PF at 12% of basic, state-slab professional tax, configurable allowances, and bulk payslip generation.",
                  chips: ["Prorated Pay", "PF & PT", "Auto Payslips"],
                },
              ].map((m, i) => (
                <div key={i} className="emp-module-card">
                  <div className="emp-module-num">0{i + 1}</div>
                  <div className="emp-module-content">
                    <div className="emp-module-title">{m.title}</div>
                    <p className="emp-module-desc">{m.desc}</p>
                    <div className="emp-module-chips">
                      {m.chips.map((c) => (
                        <span key={c} className="emp-module-chip">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── QUOTE ────────────────────────────────────────────────────────── */}
        <div id="about" className="emp-quote-section">
          <p className="emp-quote-text">
            Reduce manual dependency,{" "}
            <span>improve transparency</span>, and empower your organisation to
            make data-driven workforce decisions.
          </p>
          <p className="emp-quote-attr">EmPay — Smart HRMS Mission</p>
        </div>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="emp-cta-section">
          <div className="emp-cta-inner">
            <h2 className="emp-cta-h2">
              Your workforce
              <br />
              <span>deserves better.</span>
            </h2>
            <p className="emp-cta-sub">
              Join the organisations that have already modernised their HR
              operations with EmPay. Setup takes minutes.
            </p>
            <div className="emp-cta-btns">
              <Link href="/register" className="emp-btn-primary">
                Create your company →
              </Link>
              <Link href="/login" className="emp-btn-ghost">
                Sign in to dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer className="emp-footer">
          <div className="emp-footer-logo">
            Em<span>Pay</span>
          </div>
          <p className="emp-footer-copy">
            © 2026 EmPay. Smart Human Resource Management System.
          </p>
          <ul className="emp-footer-links">
            <li><a href="/login">Login</a></li>
            <li><a href="/register">Register</a></li>
          </ul>
        </footer>
      </div>
    </>
  );
}
