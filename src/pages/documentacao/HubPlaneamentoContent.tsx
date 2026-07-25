/**
 * Secção Planeamento Futuro — dados via loadHubPlaneamento (local).
 * Ligações cruzadas a progresso/refs/novidades/removidos (sem misturar Histórico).
 */

import { useEffect, useMemo, useState } from "react";
import {
  loadHubPlaneamento,
  type PlaneamentoEntry,
  type PlaneamentoStage,
} from "@/core/docs/planeamento";
import { AJUDA_PAGE_TOKENS as C } from "../ajuda/ajudaPageTokens";
import { loadHubWhatsNew, type WhatsNewEntry } from "./loadHubWhatsNew";
import {
  loadRemovedRegistry,
  type RemovedRegistryEntry,
} from "./loadRemovedRegistry";

const STAGE_LABEL: Record<PlaneamentoStage, string> = {
  futura: "Futura",
  em_andamento: "Em andamento",
  "concluída": "Concluída",
  bloqueada: "Bloqueada",
  dependente: "Dependente",
};

const STAGE_COLOR: Record<PlaneamentoStage, string> = {
  futura: C.muted,
  em_andamento: "var(--ci-prussian-600, var(--blue-light, #3b82f6))",
  "concluída": "var(--status-done-color, var(--ci-success, #22c55e))",
  bloqueada: "var(--status-progress-color, var(--ci-sienna-400, #f59e0b))",
  dependente: "var(--ci-prussian-200, var(--blue-light, #93c5fd))",
};

function norm(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function overlap(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = new Set(na.split(" ").filter((w) => w.length > 4));
  const wb = nb.split(" ").filter((w) => w.length > 4);
  let hit = 0;
  for (const w of wb) if (wa.has(w)) hit += 1;
  return hit >= 2;
}

export default function HubPlaneamentoContent() {
  const data = useMemo(() => loadHubPlaneamento(), []);
  const [news, setNews] = useState<WhatsNewEntry[]>([]);
  const [removed, setRemoved] = useState<RemovedRegistryEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadHubWhatsNew("adicionados").catch(() => [] as WhatsNewEntry[]),
      loadHubWhatsNew("logs").catch(() => [] as WhatsNewEntry[]),
      loadRemovedRegistry().catch(() => [] as RemovedRegistryEntry[]),
    ]).then(([features, logs, rem]) => {
      if (cancelled) return;
      setNews([...features, ...logs]);
      setRemoved(rem);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const cardStages: PlaneamentoStage[] = [
    "futura",
    "em_andamento",
    "dependente",
    "bloqueada",
  ];

  return (
    <div data-hub-planeamento style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%" }}>
      <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
        Planeamento futuro — etapas derivadas de progressoSections, progressoResumo e projectRoadmap.
        Histórico permanece separado. Roadmap {data.roadmapProgress}%.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 110px), 1fr))",
          gap: 8,
          width: "100%",
        }}
      >
        {(Object.keys(STAGE_LABEL) as PlaneamentoStage[]).map((stage) => (
          <div
            key={stage}
            style={{
              padding: "10px 8px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.bg,
              textAlign: "center",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: STAGE_COLOR[stage] }}>
              {data.stages[stage].length}
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{STAGE_LABEL[stage]}</div>
          </div>
        ))}
      </div>

      {cardStages.map((stage) => {
        const list = data.stages[stage];
        if (list.length === 0) return null;
        return (
          <div key={stage} style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: STAGE_COLOR[stage] }}>
              {STAGE_LABEL[stage]}
            </h3>
            <div
              className="hub-planeamento-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
                gap: 10,
                width: "100%",
              }}
            >
              {list.map((entry) => (
                <EtapaCard
                  key={entry.id}
                  entry={entry}
                  news={news}
                  removed={removed}
                />
              ))}
            </div>
          </div>
        );
      })}

      {data.concluidaNoResumo.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: STAGE_COLOR["concluída"] }}>
            Concluídas ligadas ao progressoResumo
          </h3>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
            {data.concluidaNoResumo.slice(0, 12).map((e) => (
              <li key={e.id} style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
                {e.title}
                <span style={{ color: C.muted }}>
                  {" "}
                  — resumo:{e.links?.progressoResumoId}
                  {e.links?.progressoSectionId ? ` · progresso:#${e.links.progressoSectionId}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>
          Roadmap futuro (editorial)
        </h3>
        {data.roadmapPhases.map((phase) => (
          <article
            key={phase.id}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.bg,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 13, color: C.text }}>{phase.title}</strong>
              <span style={{ fontSize: 11, color: C.accent }}>
                {phase.statusLabel} · {phase.doneTasks}/{phase.totalTasks} · {phase.progress}%
              </span>
            </div>
            <p style={{ margin: "6px 0 8px", fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
              {phase.description}
            </p>
            <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
              {phase.tasks.map((t) => (
                <li key={t.id} style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
                  <span style={{ color: C.muted }}>[{t.statusLabel}]</span> {t.title}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {data.notas.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text }}>
            Notas de planeamento
          </h3>
          {data.notas.map((n) => (
            <details
              key={n.id}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "10px 12px",
                background: C.bg,
              }}
            >
              <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.text }}>
                {n.title}
              </summary>
              <pre
                style={{
                  margin: "8px 0 0",
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: C.muted,
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                }}
              >
                {n.body}
              </pre>
            </details>
          ))}
        </div>
      ) : null}

      <style>{`
        @media (max-width: 820px) {
          .hub-planeamento-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function EtapaCard({
  entry,
  news,
  removed,
}: {
  entry: PlaneamentoEntry;
  news: WhatsNewEntry[];
  removed: RemovedRegistryEntry[];
}) {
  const token = entry.links?.newsMatchToken ?? entry.title;
  const newsHit = news.find((n) => overlap(n.title, token) || overlap(n.description ?? "", token));
  const removedHit =
    (entry.links?.removedId
      ? removed.find((r) => r.id === entry.links?.removedId)
      : undefined) ?? removed.find((r) => overlap(r.title, entry.title));

  return (
    <article
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.35 }}>
          {entry.title}
        </h4>
        <span style={{ fontSize: 10, fontWeight: 700, color: STAGE_COLOR[entry.stage], flexShrink: 0 }}>
          {STAGE_LABEL[entry.stage]}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.45 }}>{entry.summary}</p>
      <div style={{ fontSize: 11, color: C.muted, display: "flex", flexDirection: "column", gap: 2 }}>
        <span>fonte: {entry.source}</span>
        {entry.links?.progressoSectionId ? (
          <span>
            progresso: <a href={`#progresso`} style={{ color: C.accent }}>#{entry.links.progressoSectionId}</a>
            {entry.links.progressoItemLabel ? ` · ${entry.links.progressoItemLabel.slice(0, 48)}` : ""}
          </span>
        ) : null}
        {entry.links?.progressoResumoId ? (
          <span>progressoResumo: {entry.links.progressoResumoId}</span>
        ) : null}
        {newsHit ? (
          <span>
            novidade: <a href="#adicionados" style={{ color: C.accent }}>{newsHit.version}</a>{" "}
            {newsHit.title.slice(0, 60)}
          </span>
        ) : null}
        {removedHit ? (
          <span>
            removido: <a href="#removidos" style={{ color: C.accent }}>{removedHit.id}</a>
          </span>
        ) : null}
      </div>
    </article>
  );
}
