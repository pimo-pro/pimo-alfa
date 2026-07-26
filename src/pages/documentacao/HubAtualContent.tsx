/**
 * Seccao Atual (Estado do Sistema) — loadHubAtual + loaders existentes.
 * KPIs oficiais ficam nas cards superiores (HubStatsContent); aqui nao se duplicam.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  loadHubAtual,
  type AtualAlert,
  type AtualPhaseSummary,
  type AtualRecentChange,
} from "@/core/docs/atual";
import { AJUDA_PAGE_TOKENS as C } from "../ajuda/ajudaPageTokens";
import { loadHubWhatsNew, type WhatsNewEntry } from "./loadHubWhatsNew";
import {
  loadRemovedRegistry,
  type RemovedRegistryEntry,
} from "./loadRemovedRegistry";

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
          meta: `${n.version} \u00b7 ${n.type}`,
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

  const roadmap = snapshot.resumo.roadmapProgress;
  const completion = snapshot.resumo.progressoCompletionPercent;

  return (
    <div data-hub-atual style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%" }}>
      <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
        Estado do sistema — snapshot local ({snapshot.generatedAtLabel}). {snapshot.sourceLabel}.
      </p>

      <EditorialBlock
        title="Roadmap"
        subtitle={
          snapshot.resumo.currentPhaseTitle
            ? `Fase atual: ${snapshot.resumo.currentPhaseTitle}`
            : "Percentagens + conclus\u00e3o de sec\u00e7\u00f5es"
        }
      >
        <div
          className="hub-atual-roadmap-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 10,
            width: "100%",
          }}
        >
          <MeterCard
            label="Roadmap"
            value={`${roadmap}%`}
            percent={roadmap}
            hint={snapshot.resumo.currentPhaseTitle ?? "Phase atual"}
          />
          <MeterCard
            label={"Conclus\u00e3o (sec\u00e7\u00f5es)"}
            value={`${completion}%`}
            percent={completion}
            hint={"Progresso das sec\u00e7\u00f5es documentadas"}
          />
        </div>
      </EditorialBlock>

      <EditorialBlock
        title="Fases (progresso + planeamento)"
        subtitle={`${snapshot.resumo.faseAtual.count} em andamento \u00b7 ${snapshot.resumo.proximaFase.count} pr\u00f3ximas`}
      >
        <div
          className="hub-atual-phase-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
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

      <EditorialBlock title={"\u00daltimas altera\u00e7\u00f5es"} subtitle="novidades \u00b7 removidos \u00b7 hist\u00f3rico">
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          {recent.map((r) => (
            <li key={r.id} style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
              <span style={{ color: C.accent, fontWeight: 600 }}>{r.source}</span>
              {" \u00b7 "}
              {r.title}
              {r.meta ? <span style={{ color: C.muted }}> {"\u00b7"} {r.meta}</span> : null}
            </li>
          ))}
        </ul>
      </EditorialBlock>

      <style>{`
        @media (max-width: 820px) {
          .hub-atual-roadmap-grid,
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

function MeterCard({
  label,
  value,
  percent,
  hint,
}: {
  label: string;
  value: string;
  percent: number;
  hint?: string;
}) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <article
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.surface,
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      <svg width={44} height={44} viewBox="0 0 44 44" aria-hidden style={{ flex: "0 0 auto" }}>
        <circle cx="22" cy="22" r="18" fill="none" stroke={C.border} strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke={C.accent}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 113} 113`}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "clamp(1.15rem, 2.2vw, 1.4rem)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: C.text,
              lineHeight: 1.1,
            }}
          >
            {value}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{label}</span>
        </div>
        {hint ? (
          <div style={{ marginTop: 3, fontSize: 11, color: C.muted, lineHeight: 1.35 }}>{hint}</div>
        ) : null}
      </div>
    </article>
  );
}

function PhaseCard({ summary, href }: { summary: AtualPhaseSummary; href: string }) {
  return (
    <article
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.surface,
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          flex: "0 0 auto",
          minWidth: 36,
          height: 36,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          border: `1px solid ${C.accentBd}`,
          background: C.accentBg,
          color: C.accent,
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        {summary.count}
      </span>
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
          <strong style={{ fontSize: 12, color: C.text }}>{summary.label}</strong>
          <a href={href} style={{ fontSize: 11, color: C.accent, whiteSpace: "nowrap" }}>
            Abrir {href.replace("#", "")}
          </a>
        </div>
        <ul style={{ margin: "6px 0 0", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
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
      </div>
    </article>
  );
}
