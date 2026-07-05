/**
 * PIMO Criativo — Página de Apresentação Oficial
 *
 * REGRAS VISUAIS:
 * - NÃO usa className="theme-dark/light" — o tema é gerido pelo ThemeContext via document.documentElement
 * - Usa APENAS variáveis CSS do tema (--navy, --text-main, --blue-light, --border, etc.)
 * - Largura total (100%) em cada secção, conteúdo centrado dentro
 * - Respeita dark/light mode automaticamente
 *
 * Conteúdo baseado em: features.ts, howItWorks.ts, specs.ts, projectProgress, pim0.com
 */

import { useState } from "react";

// ── Helpers de layout ─────────────────────────────────────────────────────────

const wrap: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "0 32px",
  width: "100%",
  boxSizing: "border-box",
};

const wrapNarrow: React.CSSProperties = {
  maxWidth: 860,
  margin: "0 auto",
  padding: "0 32px",
  width: "100%",
  boxSizing: "border-box",
};

function sec(pt = 80, pb = 80): React.CSSProperties {
  return { paddingTop: pt, paddingBottom: pb };
}

// ── Ícones SVG inline ─────────────────────────────────────────────────────────

const I: Record<string, string> = {
  box:     "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  layers:  "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  cpu:     "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",
  chart:   "M18 20V10M12 20V4M6 20v-6",
  tag:     "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
  zap:     "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  check:   "M20 6L9 17l-5-5",
  arrow:   "M5 12h14M12 5l7 7-7 7",
  cut:     "M14.5 4l-5 16M4 6l16 12M4 18l16-12",
  file:    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  ruler:   "M2 12h20M6 8l-4 4 4 4M18 8l4 4-4 4",
  door:    "M3 3h7v18H3zM10 7l4-4h7v18h-7l-4-4",
  drawer:  "M2 8h20v8H2zM6 8v8M12 8v8M18 8v8",
  shelf:   "M4 12h16M4 6h16M4 18h16",
  qr:      "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h2v2h-2zM18 14h3M14 18v3M18 18h3v3h-3z",
  grid:    "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  ai:      "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  factory: "M2 20V8l5-4 5 4v12M12 20V12l5-2 5 2v8M7 20v-5h2v5",
  gear:    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7-3.06a7 7 0 0 0 .06-1 7 7 0 0 0-.06-1l2.06-1.62a.5.5 0 0 0 .12-.63l-1.95-3.38a.49.49 0 0 0-.61-.22l-2.43.98a7.36 7.36 0 0 0-2.02-1.17l-.36-2.58a.484.484 0 0 0-.48-.41h-3.9a.484.484 0 0 0-.48.41l-.36 2.58a7.48 7.48 0 0 0-2.02 1.17l-2.43-.98a.488.488 0 0 0-.61.22L.63 8.29a.477.477 0 0 0 .12.63L2.81 10.6A7 7 0 0 0 2.75 12a7 7 0 0 0 .06.94l-2.06 1.62a.477.477 0 0 0-.12.63l1.95 3.38c.12.22.39.3.61.22l2.43-.98c.63.46 1.3.82 2.02 1.17l.36 2.58c.06.23.26.41.48.41h3.9c.23 0 .42-.17.48-.41l.36-2.58a7.48 7.48 0 0 0 2.02-1.17l2.43.98c.23.08.49 0 .61-.22l1.95-3.38a.477.477 0 0 0-.12-.63z",
  track:   "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  star:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  globe:   "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
};

function Ico({ d, size = 18, color = "currentColor" }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ── Componentes reutilizáveis ─────────────────────────────────────────────────

function Badge({ label, color = "var(--blue-light,#3b82f6)" }: { label: string; color?: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 12px", borderRadius: 999,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const,
      background: `color-mix(in srgb,${color} 15%,transparent)`,
      color, border: `1px solid color-mix(in srgb,${color} 35%,transparent)`,
      marginBottom: 16,
    }}>
      {label}
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: "1px solid var(--border,rgba(255,255,255,0.1))", width: "100%" }} />;
}

function CheckRow({ text, color = "var(--status-done-color,#34d399)" }: { text: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <Ico d={I.check} size={13} color={color} />
      <span style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-muted,#94a3b8)" }}>{text}</span>
    </div>
  );
}

function StepRow({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
      <div style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: "var(--blue-light,#3b82f6)",
      }}>{n}</div>
      <div>
        <p style={{ margin: "0 0 5px", fontSize: 13, fontWeight: 600, color: "var(--text-main,#e2e8f0)" }}>{title}</p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted,#94a3b8)", lineHeight: 1.65 }}>{text}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, text, accent = "var(--blue-light,#3b82f6)" }: {
  icon: string; title: string; text: string; accent?: string;
}) {
  return (
    <div style={{
      background: "var(--card-bg,rgba(255,255,255,0.03))",
      border: "1px solid var(--card-border,rgba(255,255,255,0.07))",
      borderRadius: 12, padding: "20px 18px",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: `color-mix(in srgb,${accent} 15%,transparent)`,
        border: `1px solid color-mix(in srgb,${accent} 30%,transparent)`,
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
      }}>
        <Ico d={I[icon] ?? I.box} size={16} color={accent} />
      </div>
      <h3 style={{ margin: "0 0 7px", fontSize: 13, fontWeight: 600, color: "var(--text-main,#e2e8f0)" }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: "var(--text-muted,#94a3b8)" }}>{text}</p>
    </div>
  );
}

// ── Mock UI (simulação da interface) ──────────────────────────────────────────

function MockApp({ label }: { label: string }) {
  return (
    <div style={{
      background: "var(--black,#050816)",
      border: "1px solid var(--border,rgba(255,255,255,0.1))",
      borderRadius: 12, overflow: "hidden",
      boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
    }}>
      {/* Chrome bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "9px 14px",
        background: "rgba(255,255,255,0.025)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {["#f85149", "#d29922", "#3fb950"].map(c => (
          <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
        ))}
        <span style={{ marginLeft: 8, fontSize: 10, color: "var(--text-muted,#94a3b8)" }}>
          pim0.com — {label}
        </span>
      </div>
      {/* App shell */}
      <div style={{ display: "flex", height: 220 }}>
        {/* Sidebar icons */}
        <div style={{ width: 44, background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8, gap: 6 }}>
          {["var(--blue-light,#3b82f6)", "#94a3b8", "#94a3b8", "#94a3b8", "#94a3b8"].map((c, i) => (
            <div key={i} style={{ width: 26, height: 26, borderRadius: 6, background: i === 0 ? "rgba(59,130,246,0.18)" : "transparent", border: `1px solid ${i === 0 ? "rgba(59,130,246,0.38)" : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: c, opacity: 0.8 }} />
            </div>
          ))}
        </div>
        {/* Left panel */}
        <div style={{ width: 170, borderRight: "1px solid rgba(255,255,255,0.05)", padding: "8px 7px", display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ height: 22, borderRadius: 5, background: "rgba(255,255,255,0.05)" }} />
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ height: i === 2 ? 28 : 17, borderRadius: 5, background: i === 2 ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.025)", border: i === 2 ? "1px solid rgba(59,130,246,0.22)" : "none" }} />
          ))}
        </div>
        {/* 3D Viewport */}
        <div style={{ flex: 1, background: "linear-gradient(135deg,#050b14 0%,#0f1e35 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <svg width="120" height="96" viewBox="0 0 120 96">
            <polygon points="15,72 60,90 105,72 105,28 60,10 15,28" fill="none" stroke="rgba(59,130,246,0.45)" strokeWidth="1" />
            <polygon points="15,72 60,55 105,72" fill="rgba(255,255,255,0.03)" stroke="rgba(59,130,246,0.2)" strokeWidth="1" />
            <polygon points="15,28 60,10 60,55 15,72" fill="rgba(255,255,255,0.05)" stroke="rgba(59,130,246,0.2)" strokeWidth="1" />
            <polygon points="60,10 105,28 105,72 60,55" fill="rgba(255,255,255,0.08)" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
            <line x1="60" y1="10" x2="60" y2="55" stroke="rgba(59,130,246,0.4)" strokeWidth="0.5" strokeDasharray="3,2" />
            <text x="30" y="44" fill="rgba(59,130,246,0.6)" fontSize="8">800mm</text>
          </svg>
          <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 3 }}>
            {["S", "M", "R"].map(l => (
              <span key={l} style={{ width: 18, height: 18, borderRadius: 4, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#94a3b8" }}>{l}</span>
            ))}
          </div>
          <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 9, color: "rgba(59,130,246,0.6)", background: "rgba(0,0,0,0.4)", borderRadius: 4, padding: "2px 6px" }}>
            3D · PBR · Real-time
          </div>
        </div>
      </div>
    </div>
  );
}

function MockCutlist() {
  const rows = [
    ["LAT ESQ", "600 × 720 × 19", "MDF Branco 19", "€ 4.20"],
    ["LAT DIR", "600 × 720 × 19", "MDF Branco 19", "€ 4.20"],
    ["TAMPO",   "562 × 560 × 19", "MDF Branco 19", "€ 3.12"],
    ["FUNDO",   "562 × 560 × 19", "MDF Branco 19", "€ 3.12"],
    ["COSTA",   "562 × 682 × 10", "MDF Branco 10", "€ 1.45"],
    ["PRAT.",   "560 × 530 × 19", "MDF Branco 19", "€ 2.96"],
  ];
  return (
    <div style={{ background: "var(--card-bg,rgba(255,255,255,0.03))", border: "1px solid var(--card-border,rgba(255,255,255,0.07))", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Ico d={I.cut} size={13} color="var(--status-done-color,#34d399)" />
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main,#e2e8f0)" }}>Lista de Corte — A80 Base</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--status-done-color,#34d399)" }}>✓ Calculado</span>
      </div>
      <div style={{ padding: "4px 0" }}>
        {rows.map(([name, dims, mat, cost]) => (
          <div key={name} style={{ display: "grid", gridTemplateColumns: "70px 1fr 100px 60px", alignItems: "center", padding: "6px 16px", borderBottom: "1px solid rgba(255,255,255,0.025)", gap: 8, fontSize: 11 }}>
            <span style={{ fontFamily: "monospace", color: "var(--text-main,#e2e8f0)", fontWeight: 600 }}>{name}</span>
            <span style={{ color: "var(--text-muted,#94a3b8)", fontVariantNumeric: "tabular-nums" }}>{dims}</span>
            <span style={{ color: "rgba(148,163,184,0.6)", fontSize: 10 }}>{mat}</span>
            <span style={{ color: "var(--status-done-color,#34d399)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{cost}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 12 }}>
        <span style={{ color: "var(--text-muted)" }}>Total material: </span>
        <strong style={{ color: "var(--status-done-color,#34d399)", marginLeft: 8 }}>€ 19.05</strong>
      </div>
    </div>
  );
}

// ── Acordeão ──────────────────────────────────────────────────────────────────

function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{ border: "1px solid var(--card-border,rgba(255,255,255,0.07))", borderRadius: 10, overflow: "hidden" }}>
          <button type="button" onClick={() => setOpen(open === i ? null : i)}
            style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", background: open === i ? "rgba(59,130,246,0.06)" : "var(--card-bg,rgba(255,255,255,0.03))", border: "none", color: "var(--text-main,#e2e8f0)", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", gap: 10, fontFamily: "inherit" }}>
            {item.q}
            <span style={{ transform: open === i ? "rotate(180deg)" : "none", transition: "transform 0.15s", fontSize: 12, color: "var(--text-muted,#94a3b8)", flexShrink: 0 }}>▾</span>
          </button>
          {open === i && (
            <div style={{ padding: "0 18px 14px", fontSize: 13, color: "var(--text-muted,#94a3b8)", lineHeight: 1.7, background: "var(--card-bg,rgba(255,255,255,0.03))" }}>
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Preço card ────────────────────────────────────────────────────────────────

function PriceCard({ plan, price, period, desc, features, highlight = false, accent = "var(--blue-light,#3b82f6)" }: {
  plan: string; price: string; period: string; desc: string;
  features: string[]; highlight?: boolean; accent?: string;
}) {
  return (
    <div style={{
      background: highlight ? `color-mix(in srgb,${accent} 8%,var(--card-bg,rgba(255,255,255,0.03)))` : "var(--card-bg,rgba(255,255,255,0.03))",
      border: `1px solid ${highlight ? `color-mix(in srgb,${accent} 40%,transparent)` : "var(--card-border,rgba(255,255,255,0.07))"}`,
      borderRadius: 14, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 0,
      position: "relative" as const,
    }}>
      {highlight && (
        <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: accent, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 999, letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          Mais popular
        </div>
      )}
      <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: accent }}>{plan}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
        <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-main,#e2e8f0)", lineHeight: 1 }}>{price}</span>
        <span style={{ fontSize: 12, color: "var(--text-muted,#94a3b8)" }}>{period}</span>
      </div>
      <p style={{ margin: "0 0 20px", fontSize: 12, color: "var(--text-muted,#94a3b8)", lineHeight: 1.5 }}>{desc}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
        {features.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Ico d={I.check} size={12} color={accent} />
            <span style={{ fontSize: 12, color: "var(--text-muted,#94a3b8)", lineHeight: 1.5 }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    /* Sem className de tema — o tema é aplicado pelo ThemeContext no document.documentElement */
    <div style={{
      width: "100%",
      minHeight: "100%",
      background: "var(--navy,#0f172a)",
      color: "var(--text-main,#e2e8f0)",
      fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      overflowX: "hidden",
    }}>

      {/* ═══ HERO — largura total com gradiente ══════════════════════════════ */}
      <section style={{
        width: "100%",
        background: "linear-gradient(180deg, var(--black,#050816) 0%, var(--navy,#0f172a) 100%)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Glow de fundo */}
        <div style={{ position: "absolute", top: -300, left: "50%", transform: "translateX(-50%)", width: 1000, height: 1000, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 65%)", pointerEvents: "none" }} />

        <div style={{ ...wrap, ...sec(100, 88), position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>

            {/* Copy */}
            <div>
              <Badge label="Plataforma Inteligente de Mobiliário Otimizado" />
              <h1 style={{ fontSize: "clamp(2rem,4.5vw,3.2rem)", fontWeight: 800, lineHeight: 1.12, margin: "0 0 20px", letterSpacing: "-0.025em" }}>
                Do conceito ao ficheiro industrial —{" "}
                <span style={{ color: "var(--blue-light,#3b82f6)" }}>em minutos</span>
              </h1>
              <p style={{ fontSize: "1.08rem", lineHeight: 1.7, color: "var(--text-muted,#94a3b8)", margin: "0 0 32px", maxWidth: 520 }}>
                O PIMO é a única plataforma de design industrial paramétrico que permite conceber e produzir
                mobiliário completo — cozinhas, quartos e qualquer projeto em madeira — gerando automaticamente
                ficheiros industriais (nesting, drill) em múltiplos formatos compatíveis com qualquer máquina CNC,
                com rastreio e controlo de produção integrado, tudo a preços acessíveis para PME.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 36 }}>
                <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 9, border: "none", background: "var(--blue-light,#3b82f6)", color: "#fff", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer" }}>
                  Abrir Configurador <Ico d={I.arrow} size={14} color="#fff" />
                </button>
                <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 9, border: "1px solid var(--border,rgba(255,255,255,0.12))", background: "var(--glass,rgba(255,255,255,0.04))", color: "var(--text-main,#e2e8f0)", fontSize: "0.93rem", cursor: "pointer" }}>
                  Ver Preços
                </button>
              </div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {[
                  ["3D paramétrico em tempo real", "var(--blue-light,#3b82f6)"],
                  ["CNC/TCN automático", "var(--status-done-color,#34d399)"],
                  ["Funciona no browser", "#fbbf24"],
                ].map(([label, c]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--text-muted,#94a3b8)" }}>
                    <Ico d={I.check} size={12} color={c} />{label}
                  </div>
                ))}
              </div>
            </div>

            {/* Mock UI */}
            <MockApp label="Workspace 3D" />
          </div>
        </div>
      </section>

      <Divider />

      {/* ═══ VISÃO GERAL — 3 frentes ════════════════════════════════════════ */}
      <section style={{ width: "100%", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ ...wrap, ...sec(72, 72) }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Badge label="Visão geral" />
            <h2 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, margin: "0 0 14px", letterSpacing: "-0.015em" }}>
              Três frentes. Uma plataforma.
            </h2>
            <p style={{ fontSize: "1.02rem", lineHeight: 1.7, color: "var(--text-muted,#94a3b8)", maxWidth: 560, margin: "0 auto" }}>
              O PIMO liga o utilizador final diretamente à carpintaria, eliminando o fosso entre a intenção criativa e a capacidade técnica de produção.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 28 }}>
            {[
              {
                icon: "factory", accent: "var(--blue-light,#3b82f6)", title: "Industrial",
                text: "Carpintarias recebem ficheiros técnicos precisos que reduzem erros e tempo de produção. CNC/TCN, XML de furação e lista de corte prontos para máquina.",
                items: ["Redução de erros de medição", "Ficheiros CNC prontos", "Lista de corte automática", "XML de furação 32mm"],
              },
              {
                icon: "layers", accent: "#a78bfa", title: "Comercial",
                text: "Designers e arquitetos obtêm ferramentas de grau profissional com geração automática de ficheiros técnicos — sem software complexo nem licenças caras.",
                items: ["Visualização 3D PBR", "PDF técnico profissional", "Materiais e acabamentos", "Exportação para cliente"],
              },
              {
                icon: "globe", accent: "var(--status-done-color,#34d399)", title: "Consumidor",
                text: "Utilizadores finais acedem a mobiliário personalizado de qualidade sem complexidade técnica. Configure, visualize e encomende diretamente.",
                items: ["Configurador intuitivo", "Orçamento instantâneo", "Sem conhecimento técnico", "Entrega direta"],
              },
            ].map(c => (
              <div key={c.title} style={{ background: "var(--card-bg,rgba(255,255,255,0.03))", border: "1px solid var(--card-border,rgba(255,255,255,0.07))", borderRadius: 14, padding: "28px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `color-mix(in srgb,${c.accent} 15%,transparent)`, border: `1px solid color-mix(in srgb,${c.accent} 30%,transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ico d={I[c.icon] ?? I.box} size={18} color={c.accent} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-main,#e2e8f0)" }}>{c.title}</h3>
                </div>
                <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-muted,#94a3b8)", lineHeight: 1.65 }}>{c.text}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {c.items.map(item => <CheckRow key={item} text={item} color={c.accent} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ═══ COMO FUNCIONA ═══════════════════════════════════════════════════ */}
      <section style={{ width: "100%" }}>
        <div style={{ ...wrap, ...sec() }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Badge label="Fluxo de trabalho" />
            <h2 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, margin: "0 0 14px", letterSpacing: "-0.015em" }}>
              Do módulo ao ficheiro de produção em 4 passos
            </h2>
            <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "var(--text-muted,#94a3b8)", maxWidth: 540, margin: "0 auto" }}>
              Fluxo desenhado para minimizar decisões manuais e maximizar consistência industrial.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <StepRow n={1} title="Escolher módulo no catálogo"
                text="Selecione base, superior, roupeiro ou PI models. O sistema aplica automaticamente: espessura 19mm, costa 10mm, folgas e recuos industriais." />
              <StepRow n={2} title="Configurar portas, gavetas e materiais"
                text="Porta simples/dupla, número de gavetas (0-4), prateleiras (0-5) e material. Regras de construção validam cada escolha em tempo real." />
              <StepRow n={3} title='Gerar Design 3D'
                text="O sistema converte os placeholders em BoxModules completos. Calcula painéis, ferragens, furação e custos. O 3D é montado da estrutura calculada." />
              <StepRow n={4} title="Exportar para produção"
                text="PDF técnico, lista de corte Excel, CNC/TCN, Drill XML e etiquetas QR. Pacote ZIP com todos os artefactos num único ficheiro." />
            </div>
            <div style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <MockCutlist />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "Painéis calculados", value: "6 peças", c: "var(--blue-light,#3b82f6)" },
                  { label: "Material total", value: "1.42 m²", c: "#a78bfa" },
                  { label: "Custo total", value: "€ 43.85", c: "var(--status-done-color,#34d399)" },
                ].map(s => (
                  <div key={s.label} style={{ background: "var(--card-bg,rgba(255,255,255,0.03))", border: "1px solid var(--card-border,rgba(255,255,255,0.07))", borderRadius: 9, padding: "12px 14px", textAlign: "center" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 700, color: s.c }}>{s.value}</p>
                    <p style={{ margin: 0, fontSize: 10, color: "var(--text-muted,#94a3b8)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ═══ MÓDULOS DA PLATAFORMA ════════════════════════════════════════════ */}
      <section style={{ width: "100%", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ ...wrap, ...sec(72, 72) }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Badge label="Módulos" />
            <h2 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, margin: "0 0 14px", letterSpacing: "-0.015em" }}>
              Três módulos. Um ecossistema.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
            {[
              {
                icon: "box", accent: "var(--blue-light,#3b82f6)",
                tag: "Operacional", tagColor: "var(--status-done-color,#34d399)",
                title: "PIMO Criativo",
                desc: "Configurador 3D paramétrico. Cria caixas com variáveis dimensionais, materiais e ferragens. Gera ficheiros técnicos industriais automaticamente.",
                features: [
                  "Visualização 3D em tempo real (Three.js + PBR)",
                  "Configuração paramétrica de portas, gavetas, prateleiras",
                  "Lista de corte industrial automática",
                  "Exportação CNC/TCN, Drill XML, PDF, ZIP",
                  "Nesting PRO/Fast com otimização de chapas",
                  "Multi-box: vários módulos num projeto",
                  "Regras dinâmicas de construção",
                ],
              },
              {
                icon: "track", accent: "#a78bfa",
                tag: "Em desenvolvimento", tagColor: "#fbbf24",
                title: "PIMO Track",
                desc: "Sistema de ordens de trabalho com rastreio peça a peça. Estado em tempo real em cada fase da produção.",
                features: [
                  "Etiquetas QR code por peça",
                  "Rastreio: corte → furação → lacagem → entrega",
                  "Dashboard de estado por projeto",
                  "Histórico completo de produção",
                  "Consulta rápida por telemóvel",
                  "Integração com PIMO Criativo",
                ],
              },
              {
                icon: "ai", accent: "#f472b6",
                tag: "Investigação", tagColor: "#f472b6",
                title: "PIMO AI",
                desc: "Agente de IA especializado em carpintaria. Otimização de design, deteção de erros e orçamentos instantâneos.",
                features: [
                  "Sugestões automáticas de configuração",
                  "Otimização de nesting por IA",
                  "Deteção proativa de erros construtivos",
                  "Orçamentos com base em histórico",
                  "Integração total com PIMO Criativo",
                  "Fine-tuning no domínio de carpintaria",
                ],
              },
            ].map(m => (
              <div key={m.title} style={{ background: "var(--card-bg,rgba(255,255,255,0.03))", border: `1px solid color-mix(in srgb,${m.accent} 25%,var(--card-border,rgba(255,255,255,0.07)))`, borderRadius: 14, padding: "28px 24px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `color-mix(in srgb,${m.accent} 15%,transparent)`, border: `1px solid color-mix(in srgb,${m.accent} 30%,transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ico d={I[m.icon] ?? I.box} size={18} color={m.accent} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: m.tagColor, background: `color-mix(in srgb,${m.tagColor} 12%,transparent)`, border: `1px solid color-mix(in srgb,${m.tagColor} 30%,transparent)`, borderRadius: 999, padding: "2px 9px", letterSpacing: "0.06em", textTransform: "uppercase" }}>{m.tag}</span>
                </div>
                <h3 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700, color: "var(--text-main,#e2e8f0)" }}>{m.title}</h3>
                <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-muted,#94a3b8)", lineHeight: 1.65 }}>{m.desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  {m.features.map(f => <CheckRow key={f} text={f} color={m.accent} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ═══ FUNCIONALIDADES DETALHADAS ══════════════════════════════════════ */}
      <section style={{ width: "100%" }}>
        <div style={{ ...wrap, ...sec() }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <Badge label="Funcionalidades" />
            <h2 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, margin: "0 0 12px", letterSpacing: "-0.015em" }}>
              Tudo o que o PIMO Criativo faz
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
            {[
              { icon: "box",    title: "Configuração Paramétrica",  text: "Caixas com dimensões livres. Espessura 19mm, costa 10mm, pés e folgas industriais aplicados automaticamente.",                            accent: "var(--blue-light,#3b82f6)" },
              { icon: "layers", title: "Viewer 3D (Three.js)",      text: "Motor PBR com sombras PCFSoft, iluminação 3-pontos, materiais realistas e controlos de câmara completos.",                             accent: "#a78bfa"                   },
              { icon: "door",   title: "Portas e Gavetas",          text: "Porta simples/dupla com dobradiças calculadas. Gavetas com corrediças, recuos e validação automática de folgas.",                       accent: "#fbbf24"                   },
              { icon: "shelf",  title: "Prateleiras e Pés",         text: "Prateleiras com suporte de pinos 5mm. Pés de 100mm integrados na altura total. Ativação por clique.",                                  accent: "var(--status-done-color,#34d399)"  },
              { icon: "cut",    title: "Lista de Corte Industrial",  text: "Todos os painéis com C×L×E mm, material e custo. Merge de peças paramétricas e GLB numa única lista.",                                 accent: "var(--status-done-color,#34d399)"  },
              { icon: "gear",   title: "Furação 32mm (CNC/TCN)",    text: "Planos de furação automáticos: cavilhas, corrediças, dobradiças e suportes. Formato industrial TCN e Drill XML.",                        accent: "var(--blue-light,#3b82f6)" },
              { icon: "file",   title: "Exportação Completa",       text: "PDF técnico, PDF etiquetas, Excel/CSV, CNC TCN (múltiplos métodos), Drill XML e pacote ZIP com tudo.",                                  accent: "#a78bfa"                   },
              { icon: "grid",   title: "Nesting PRO/Fast",          text: "Otimização de aproveitamento de chapas com algoritmos skyline, guillotine e shelf. Mínimo desperdício.",                                accent: "#f472b6"                   },
              { icon: "cpu",    title: "Multi-Box + Auto-Layout",    text: "Múltiplos módulos no workspace. Auto-posicionamento, deteção de colisões e alinhamento automático.",                                    accent: "#fbbf24"                   },
              { icon: "tag",    title: "PIMO-TRAK QR",              text: "Etiquetas com QR code único por peça. Rastreio desde o corte até à entrega com leitura por telemóvel.",                                accent: "#fbbf24"                   },
              { icon: "chart",  title: "Resumo Financeiro",         text: "Custo por m² de cada material, ferragens, acessórios e margem. Orçamento completo gerado automaticamente.",                            accent: "var(--status-done-color,#34d399)"  },
              { icon: "ruler",  title: "Regras Dinâmicas",          text: "Perfis de regras configuráveis: dimensões mínimas/máximas, materiais compatíveis, sobreposições e restrições.",                         accent: "#a78bfa"                   },
            ].map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      <Divider />

      {/* ═══ EXPORTAÇÕES — largura total com fundo alternado ════════════════ */}
      <section style={{ width: "100%", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ ...wrap, ...sec(72, 72) }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
            <div>
              <Badge label="Exportação industrial" />
              <h2 style={{ fontSize: "clamp(1.4rem,3vw,1.9rem)", fontWeight: 700, margin: "0 0 14px", letterSpacing: "-0.015em" }}>
                Ficheiros prontos para cada fase da produção
              </h2>
              <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "var(--text-muted,#94a3b8)", margin: "0 0 28px" }}>
                O PIMO gera automaticamente todos os artefactos técnicos — sem configuração manual, sem erros de transcrição.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { icon: "file",  label: "PDF Técnico",          desc: "Relatório completo: imagem 3D, lista de peças, materiais, ferragens e preço. Para o cliente ou arquivo.", c: "var(--blue-light,#3b82f6)" },
                  { icon: "cut",   label: "Lista de Corte",        desc: "Todas as peças com dimensões mm, material e custo. Exportável em Excel/CSV. Atualiza em tempo real.",       c: "var(--status-done-color,#34d399)"  },
                  { icon: "cpu",   label: "CNC / TCN",             desc: "Furação 32mm para Biesse, Homag, SCM e similares. Cavilhas, corrediças, dobradiças por painel.",           c: "#a78bfa"  },
                  { icon: "ruler", label: "Drill XML",             desc: "Plano de furação em XML: posição, diâmetro e profundidade de cada furo por painel.",                       c: "#fbbf24"  },
                  { icon: "grid",  label: "Nesting PRO/Fast",      desc: "Layout de corte otimizado para minimizar desperdício. Dois modos: velocidade e qualidade máxima.",         c: "#f472b6"  },
                  { icon: "tag",   label: "Etiquetas QR",          desc: "Etiquetas com QR code por peça para impressão A4 ou autocolantes. Para rastreio PIMO-TRAK.",              c: "#fbbf24"  },
                ].map(e => (
                  <div key={e.label} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `color-mix(in srgb,${e.c} 15%,transparent)`, border: `1px solid color-mix(in srgb,${e.c} 30%,transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Ico d={I[e.icon]} size={14} color={e.c} />
                    </div>
                    <div>
                      <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 600, color: "var(--text-main,#e2e8f0)" }}>{e.label}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted,#94a3b8)", lineHeight: 1.55 }}>{e.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Specs reais da caixa */}
              {[
                ["PAINÉIS", "Laterais: altura total − (tampo + fundo). Dimensões com todas as folgas industriais.", "var(--blue-light,#3b82f6)"],
                ["COSTA",    "Espessura fixa 10mm — não prolonga o bounding box em Z.", "#a78bfa"],
                ["PORTA",    "Folgas overlay e inset. Dobradiças calculadas por ângulo de abertura.", "#fbbf24"],
                ["GAVETA",   "Frente: largura total. Corpo: −26mm para corrediças. Altura mínima respeitada.", "var(--status-done-color,#34d399)"],
                ["PRATELEIRA","Largura = interna − 2mm. Profundidade = total − 5mm. Furos de pinos automáticos.", "#f472b6"],
              ].map(([title, text, color]) => (
                <div key={title} style={{ background: "var(--card-bg,rgba(255,255,255,0.03))", border: "1px solid var(--card-border,rgba(255,255,255,0.07))", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 12 }}>
                  <div style={{ width: 5, borderRadius: 3, background: color as string, flexShrink: 0, alignSelf: "stretch", minHeight: 28 }} />
                  <div>
                    <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 700, color: color as string, letterSpacing: "0.05em", textTransform: "uppercase" }}>{title as string}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted,#94a3b8)", lineHeight: 1.55 }}>{text as string}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ═══ PREÇOS ══════════════════════════════════════════════════════════ */}
      <section style={{ width: "100%" }}>
        <div style={{ ...wrap, ...sec() }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <Badge label="Preços" color="var(--status-done-color,#34d399)" />
            <h2 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, margin: "0 0 12px", letterSpacing: "-0.015em" }}>
              Planos para cada necessidade
            </h2>
            <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "var(--text-muted,#94a3b8)", maxWidth: 480, margin: "0 auto" }}>
              Do configurador gratuito ao sistema industrial completo.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 20 }}>
            <PriceCard plan="Free" price="€ 0" period="/mês"
              desc="Configurador 3D completo. Perfeito para explorar o sistema."
              features={["Configurador 3D paramétrico completo", "Orçamento e pedido de cotação", "Visualização PBR em tempo real", "Sem descarregar ficheiros técnicos"]}
              accent="var(--text-muted,#94a3b8)" />
            <PriceCard plan="Pro" price="€ 10" period="/mês"
              desc="Para designers e projetistas profissionais."
              features={["Tudo do plano Free", "Edição completa de dimensões", "Templates de corte manuais", "Exportação PDF técnico", "Suporte prioritário"]}
              accent="var(--blue-light,#3b82f6)" highlight />
            <PriceCard plan="Ultra" price="€ 300" period="/mês"
              desc="Grau industrial para carpintarias e fábricas."
              features={["Tudo do Pro", "Ficheiros CNC/TCN completos", "XML de furação 32mm", "Nesting PRO profissional", "Portal com marca própria", "Etiquetas PIMO-TRAK QR"]}
              accent="#a78bfa" />
            <PriceCard plan="Ultra+" price="€ 5.000" period="/ano"
              desc="Enterprise white-label com suporte dedicado."
              features={["Tudo do Ultra", "Domínio personalizado", "Acesso API", "Suporte dedicado", "Integrações externas", "SLA garantido"]}
              accent="#fbbf24" />
          </div>
        </div>
      </section>

      <Divider />

      {/* ═══ MERCADO ════════════════════════════════════════════════════════ */}
      <section style={{ width: "100%", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ ...wrap, ...sec(64, 64) }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Badge label="Mercado" color="#fbbf24" />
            <h2 style={{ fontSize: "clamp(1.4rem,3vw,1.9rem)", fontWeight: 700, margin: "0 0 12px", letterSpacing: "-0.015em" }}>
              Mercado global de $791B em crescimento
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
            {[
              { val: "$791B", label: "Mercado global de mobiliário (2025)", c: "var(--blue-light,#3b82f6)" },
              { val: "$455B", label: "Segmento eCommerce de mobiliário", c: "#a78bfa" },
              { val: "23.9%", label: "Crescimento anual do segmento digital", c: "var(--status-done-color,#34d399)" },
              { val: "35-45%", label: "CAGR estimado B2B configurador + ficheiros CNC", c: "#fbbf24" },
              { val: "2.500+", label: "Retalhistas de mobiliário em Portugal", c: "#f472b6" },
              { val: "50.000+", label: "Lojas europeias parceiras target (Ultra)", c: "var(--blue-light,#3b82f6)" },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--card-bg,rgba(255,255,255,0.03))", border: "1px solid var(--card-border,rgba(255,255,255,0.07))", borderRadius: 12, padding: "20px 18px", textAlign: "center" }}>
                <p style={{ margin: "0 0 8px", fontSize: "1.6rem", fontWeight: 800, color: s.c }}>{s.val}</p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted,#94a3b8)", lineHeight: 1.5 }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 36, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {[
              { year: "2026", rev: "€ 3–8K/mês", clients: "10–20 Pro · 2–3 Ultra" },
              { year: "2027", rev: "€ 15–30K/mês", clients: "100+ Pro · 10 Ultra" },
              { year: "2028+", rev: "€ 50–80K/mês", clients: "Rede europeia de parceiros" },
            ].map(p => (
              <div key={p.year} style={{ background: "var(--card-bg,rgba(255,255,255,0.03))", border: "1px solid var(--card-border,rgba(255,255,255,0.07))", borderRadius: 12, padding: "18px 20px" }}>
                <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "var(--blue-light,#3b82f6)" }}>{p.year}</p>
                <p style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main,#e2e8f0)" }}>{p.rev}</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted,#94a3b8)" }}>{p.clients}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ═══ TECNOLOGIA ══════════════════════════════════════════════════════ */}
      <section style={{ width: "100%" }}>
        <div style={{ ...wrap, ...sec(64, 64) }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
            <div>
              <Badge label="Stack tecnológica" />
              <h2 style={{ fontSize: "clamp(1.4rem,3vw,1.9rem)", fontWeight: 700, margin: "0 0 14px", letterSpacing: "-0.015em" }}>
                Construído com as melhores tecnologias web
              </h2>
              <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "var(--text-muted,#94a3b8)", margin: "0 0 28px" }}>
                React 19 + TypeScript + Three.js + Vite. Aproximadamente 150.000 linhas de código em 449 ficheiros. Zero instalação — corre diretamente no browser.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <CheckRow text="React 19 com TypeScript — interface reativa com tipagem completa e guards defensivos." />
                <CheckRow text="Three.js / React Three Fiber — motor 3D PBR com sombras PCFSoft e viewer modular." />
                <CheckRow text="Vite + Vitest — build ultrarrápido e suite de testes para regras críticas de produção." />
                <CheckRow text="Zustand + Context API — estado híbrido: UI local e dados de projeto separados." />
                <CheckRow text="Algoritmos de nesting: skyline, guillotine e shelf para otimização de corte." />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { val: "~150K", label: "Linhas de código", c: "var(--blue-light,#3b82f6)" },
                { val: "449", label: "Ficheiros TypeScript/React", c: "#a78bfa" },
                { val: "12", label: "Módulos core funcionais", c: "var(--status-done-color,#34d399)" },
                { val: "v4.1", label: "Versão atual", c: "#fbbf24" },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--card-bg,rgba(255,255,255,0.03))", border: "1px solid var(--card-border,rgba(255,255,255,0.07))", borderRadius: 10, padding: "16px", textAlign: "center" }}>
                  <p style={{ margin: "0 0 5px", fontSize: "1.4rem", fontWeight: 800, color: s.c }}>{s.val}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted,#94a3b8)", lineHeight: 1.4 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ═══ FAQ ═════════════════════════════════════════════════════════════ */}
      <section style={{ width: "100%", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ ...wrapNarrow, ...sec(72, 72) }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Badge label="FAQ" />
            <h2 style={{ fontSize: "clamp(1.4rem,3vw,1.9rem)", fontWeight: 700, margin: "0 0 12px", letterSpacing: "-0.015em" }}>
              Perguntas frequentes
            </h2>
          </div>
          <Accordion items={[
            { q: "O PIMO funciona sem instalação?", a: "Sim. O PIMO Criativo corre diretamente no browser. Não é necessário instalar nenhum software. Os dados do projeto são guardados localmente (localStorage) ou na conta de utilizador." },
            { q: "Que máquinas CNC são compatíveis com os ficheiros exportados?", a: "O PIMO exporta em formato TCN (compatível com Biesse, Homag, SCM e centros similares) e Drill XML. A compatibilidade depende do software da máquina, mas estes formatos são padrão na indústria europeia." },
            { q: "É possível ter vários módulos num projeto?", a: "Sim. O Multi-Box permite adicionar quantos módulos precisar. O auto-positioning organiza as caixas lado a lado com deteção de colisões em tempo real. Pode ter cozinhas completas, roupeiros e outros módulos no mesmo projeto." },
            { q: "Como funciona o nesting / layout de corte?", a: "O PIMO usa algoritmos de skyline, guillotine e shelf. Modo Fast para estimativas rápidas, modo PRO para otimização máxima com rotação de 90° das peças. O resultado mostra percentagem de aproveitamento e número de chapas necessárias." },
            { q: "Qual a diferença entre PIMO Criativo e um software CAD tradicional?", a: "Ao contrário de software CAD genérico, o PIMO é especializado em mobiliário e aplica automaticamente todas as regras industriais (espessuras, folgas, furação 32mm). Não requer formação técnica e os ficheiros de produção são gerados sem intervenção manual." },
            { q: "O PIMO-TRAK funciona com qualquer scanner de QR code?", a: "Sim. As etiquetas usam QR codes padrão compatíveis com qualquer câmara de telemóvel ou scanner industrial. Não é necessário hardware especializado." },
            { q: "Como são calculados os custos no resumo financeiro?", a: "O sistema usa a biblioteca de materiais configurada no admin: custo por m² de cada material × área total dos painéis, mais ferragens (dobradiças, corrediças, suportes) calculadas automaticamente pela configuração de cada caixa." },
          ]} />
        </div>
      </section>

      <Divider />

      {/* ═══ CTA FINAL ═══════════════════════════════════════════════════════ */}
      <section style={{ width: "100%", background: "linear-gradient(180deg, var(--navy,#0f172a) 0%, var(--black,#050816) 100%)" }}>
        <div style={{ ...wrapNarrow, ...sec(88, 100), textAlign: "center" }}>
          <Badge label="Comece agora" />
          <h2 style={{ fontSize: "clamp(1.6rem,3.5vw,2.3rem)", fontWeight: 800, margin: "0 auto 16px", maxWidth: 560, letterSpacing: "-0.02em" }}>
            Pronto para eliminar erros manuais na sua produção?
          </h2>
          <p style={{ fontSize: "1.02rem", lineHeight: 1.7, color: "var(--text-muted,#94a3b8)", margin: "0 auto 40px", maxWidth: 460 }}>
            Aceda ao PIMO Criativo agora. Funciona diretamente no browser, sem registo obrigatório para começar.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "14px 30px", borderRadius: 10, border: "none", background: "var(--blue-light,#3b82f6)", color: "#fff", fontSize: "1rem", fontWeight: 700, cursor: "pointer" }}>
              Abrir Configurador <Ico d={I.arrow} size={16} color="#fff" />
            </button>
            <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "13px 28px", borderRadius: 10, border: "1px solid var(--border,rgba(255,255,255,0.12))", background: "var(--glass,rgba(255,255,255,0.04))", color: "var(--text-main,#e2e8f0)", fontSize: "0.97rem", cursor: "pointer" }}>
              Contactar Equipa
            </button>
          </div>
          <p style={{ marginTop: 24, fontSize: 12, color: "var(--text-muted,#94a3b8)" }}>
            Plano gratuito disponível · Sem cartão de crédito · Cancele quando quiser
          </p>
        </div>
      </section>

      {/* ═══ MINI FOOTER ═════════════════════════════════════════════════════ */}
      <footer style={{ width: "100%", borderTop: "1px solid var(--divider,rgba(255,255,255,0.06))", background: "var(--black,#050816)", padding: "24px 0" }}>
        <div style={{ ...wrap, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: "var(--blue-light,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>P</div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main,#e2e8f0)" }}>PIMO Criativo</span>
              <span style={{ fontSize: 11, color: "var(--text-muted,#94a3b8)", marginLeft: 8 }}>Plataforma Inteligente de Mobiliário Otimizado</span>
            </div>
          </div>
          <p style={{ fontSize: 11, color: "var(--text-muted,#94a3b8)", margin: 0 }}>
            © {new Date().getFullYear()} PIMO Criativo · Crafted by Khaled · pim0.com
          </p>
        </div>
      </footer>
    </div>
  );
}
