/**
 * Secção Atual (Estado do Sistema) — loadHubAtual + loaders existentes para recentes.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  loadHubAtual,
  type AtualAlert,
  type AtualKpi,
  type AtualPhaseSummary,
  type AtualRecentChange,
} from "@/core/docs/atual";
import type { HubStatIcon, HubStatTone } from "./loadHubStats";
import { AJUDA_PAGE_TOKENS as C } from "../ajuda/ajudaPageTokens";
import { loadHubWhatsNew, type WhatsNewEntry } from "./loadHubWhatsNew";
import {
  loadRemovedRegistry,
  type RemovedRegistryEntry,
} from "./loadRemovedRegistry";

const UP_GREEN = "var(--status-done-color, var(--ci-success, #22c55e))";

const TONE: Record<HubStatTone, { icon: string; chipBd: string; chipBg: string }> = {
  neutral: { icon: C.muted, chipBd: C.border, chipBg: "transparent" },
  blue: { icon: C.accent, chipBd: C.accentBd, chipBg: C.accentBg },
  green: {
    icon: UP_GREEN,
    chipBd: "color-mix(in srgb, var(--status-done-color, var(--ci-success, #22c55e)) 35%, transparent)",
    chipBg: "color-mix(in srgb, var(--status-done-color, var(--ci-success, #22c55e)) 12%, transparent)",
  },
};

const ALERT_COLOR: Record<AtualAlert["level"], string> = {
  info: C.accent,
  warn: "var(--status-progress-color, var(--ci-sienna-400, #f59e0b))",
  critical: "var(--ci-sienna-500, #ef4444)",
};

export default function HubAtualContent() {
  const snapshot = useMemo(() => loadHubAtual(), []);
  const [recent, setRecent] = useState<AtualRecentChange[]>(() =>
    snapshot.historicoRecent.map((h) => ({
      id: h.id,
      source: "historico" as const,
      title: h.title,
      meta: h.kind,
    }))
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadHubWhatsNew("adicionados").catch(() => [] as WhatsNewEntry[]),
      loadHubWhatsNew("logs").catch(() => [] as WhatsNewEntry[]),
      loadRemovedRegistry().catch(() => [] as RemovedRegistryEntry[]),
    ]).then(([features, logs, removed]) => {
      if (cancelled) return;
      const news = [...features, ...logs]
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
        .slice(0, 5)
        .map((n) => ({
          id: `news-${n.version}-${n.publishedAt}`,
          source: "novidades" as const,
          title: n.title,
          meta: `${n.version} · ${n.type}`,
        }));
      const rem = removed.slice(0, 5).map((r) => ({
        id: `rem-${r.id}`,
        source: "removidos" as const,
        title: r.title,
        meta: r.removedIn,
      }));
      const hist = snapshot.historicoRecent.map((h) => ({
        id: h.id,
        source: "historico" as const,
        title: h.title,
        meta: h.kind,
      }));
      setRecent([...news, ...rem, ...hist].slice(0, 15));
    });
    return () => {
      cancelled = true;
    };
  }, [snapshot.historicoRecent]);

  return (
    <div data-hub-atual style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%" }}>
      <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
        Estado do sistema — snapshot local ({snapshot.generatedAtLabel}). {snapshot.sourceLabel}.
      </p>

      <div
        className="hub-atual-kpi-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: 10,
          width: "100%",
        }}
      >
        {snapshot.kpis.map((kpi) => (
          <KpiCard key={kpi.id} card={kpi} />
        ))}
      </div>

      <EditorialBlock
        title="Fases (progresso + planeamento)"
        subtitle={
          snapshot.resumo.currentPhaseTitle
            ? `Roadmap ${snapshot.resumo.roadmapProgress}% · Phase: ${snapshot.resumo.currentPhaseTitle} · Conclusão secções ${snapshot.resumo.progressoCompletionPercent}%`
            : `Roadmap ${snapshot.resumo.roadmapProgress}% · Conclusão secções ${snapshot.resumo.progressoCompletionPercent}%`
        }
      >
        <div
          className="hub-atual-phase-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: 10,
            width: "100%",
          }}
        >
          <PhaseCard summary={snapshot.resumo.faseAtual} href="#planeamento" />
          <PhaseCard summary={snapshot.resumo.proximaFase} href="#planeamento" />
          <PhaseCard summary={snapshot.resumo.ultimaConcluida} href="#progresso" />
          <PhaseCard summary={snapshot.resumo.bloqueadas} href="#planeamento" />
          <PhaseCard summary={snapshot.resumo.dependencias} href="#planeamento" />
        </div>
      </EditorialBlock>

      <EditorialBlock title="Alertas" subtitle={`${snapshot.alerts.length} ativo(s)`}>
        {snapshot.alerts.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Sem alertas neste momento.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            {snapshot.alerts.map((a) => (
              <li key={a.id} style={{ fontSize: 12, color: C.text, lineHeight: 1.45 }}>
                <span style={{ fontWeight: 700, color: ALERT_COLOR[a.level] }}>[{a.level}]</span>{" "}
                {a.title}
                <div style={{ color: C.muted }}>{a.detail}</div>
              </li>
            ))}
          </ul>
        )}
      </EditorialBlock>

      <EditorialBlock title="Últimas alterações" subtitle="novidades · removidos · histórico">
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          {recent.map((r) => (
            <li key={r.id} style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
              <span style={{ color: C.accent, fontWeight: 600 }}>{r.source}</span>
              {" · "}
              {r.title}
              {r.meta ? <span style={{ color: C.muted }}> · {r.meta}</span> : null}
            </li>
          ))}
        </ul>
      </EditorialBlock>

      <style>{`
        @media (max-width: 820px) {
          .hub-atual-kpi-grid,
          .hub-atual-phase-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function EditorialBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.bg,
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>{title}</h3>
        {subtitle ? (
          <p style={{ margin: "4px 0 0", fontSize: 11, color: C.muted }}>{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function PhaseCard({ summary, href }: { summary: AtualPhaseSummary; href: string }) {
  return (
    <article
      style={{
        padding: "12px 12px",
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: C.surface,
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ fontSize: 12, color: C.text }}>{summary.label}</strong>
        <span style={{ fontSize: 14, fontWeight: 800, color: C.accent }}>{summary.count}</span>
      </div>
      <ul style={{ margin: "8px 0 0", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
        {summary.items.length === 0 ? (
          <li style={{ fontSize: 11, color: C.muted }}>Sem itens</li>
        ) : (
          summary.items.slice(0, 4).map((it) => (
            <li key={it.id} style={{ fontSize: 11, color: C.muted, lineHeight: 1.35 }}>
              {it.title.slice(0, 72)}
            </li>
          ))
        )}
      </ul>
      <a href={href} style={{ marginTop: 8, display: "inline-block", fontSize: 11, color: C.accent }}>
        Abrir {href.replace("#", "")}
      </a>
    </article>
  );
}

function KpiCard({ card }: { card: AtualKpi }) {
  const tone = TONE[card.tone];
  return (
    <article
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "14px 14px 12px",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.surface,
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            border: `1px solid ${tone.chipBd}`,
            background: tone.chipBg,
            color: tone.icon,
          }}
        >
          <StatIcon name={card.icon} />
        </span>
        {card.delta && card.delta.direction === "up" ? (
          <span style={{ fontSize: 11, fontWeight: 700, color: UP_GREEN }}>
            ↑ {card.delta.percentLabel}
          </span>
        ) : null}
      </div>
      <div>
        <div
          style={{
            fontSize: "clamp(1.25rem, 2.4vw, 1.55rem)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: C.text,
            lineHeight: 1.15,
          }}
        >
          {card.value}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: C.text }}>{card.label}</div>
        {card.hint ? (
          <div style={{ marginTop: 2, fontSize: 11, color: C.muted }}>{card.hint}</div>
        ) : null}
      </div>
    </article>
  );
}

function StatIcon({ name }: { name: HubStatIcon }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "code":
      return (
        <svg {...common}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case "files":
      return (
        <svg {...common}>
          <path d="M3 7h5l2 2h11v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        </svg>
      );
    case "projects":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "designer":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
        </svg>
      );
    case "dev":
      return (
        <svg {...common}>
          <rect x="2" y="4" width="20" height="14" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 18v3" />
        </svg>
      );
    case "ai":
      return (
        <svg {...common}>
          <path d="M12 3v3" />
          <path d="M12 18v3" />
          <path d="M3 12h3" />
          <path d="M18 12h3" />
          <circle cx="12" cy="12" r="4.5" />
        </svg>
      );
    default:
      return null;
  }
}
