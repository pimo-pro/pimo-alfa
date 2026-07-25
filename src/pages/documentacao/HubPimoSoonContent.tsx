/**
 * Secção pimo-soon — Plano Futuro (híbrido A+C).
 */

import { useMemo } from "react";
import {
  loadHubPimoSoon,
  type PimoSoonFase,
  type PimoSoonStatus,
} from "@/core/docs/pimoSoon";
import { AJUDA_PAGE_TOKENS as C } from "../ajuda/ajudaPageTokens";

const STATUS_LABEL: Record<PimoSoonStatus, string> = {
  planned: "Planeada",
  optional: "Opcional",
  blocked: "Bloqueada",
};

const STATUS_COLOR: Record<PimoSoonStatus, string> = {
  planned: C.accent,
  optional: "var(--status-done-color, var(--ci-success, #22c55e))",
  blocked: "var(--status-progress-color, var(--ci-sienna-400, #f59e0b))",
};

export default function HubPimoSoonContent() {
  const data = useMemo(() => loadHubPimoSoon(), []);

  return (
    <div data-hub-pimo-soon style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <header style={{ width: "100%" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            background: C.accentBg,
            color: C.accent,
            border: `1px solid ${C.accentBd}`,
          }}
        >
          @{data.tag}
        </div>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: "-0.01em" }}>
          {data.title}
        </h3>
        <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.55 }}>{data.blurb}</p>
      </header>

      <div
        className="hub-pimo-soon-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
          gap: 12,
          width: "100%",
        }}
      >
        {data.fases.map((fase) => (
          <FaseCard key={fase.id} fase={fase} />
        ))}
      </div>

      <section
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          background: C.bg,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: C.text }}>
          Notas editoriais
        </h3>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          {data.notas.map((n) => (
            <li key={n.id} style={{ fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
              {n.body}
            </li>
          ))}
        </ul>
      </section>

      <style>{`
        @media (max-width: 820px) {
          .hub-pimo-soon-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function FaseCard({ fase }: { fase: PimoSoonFase }) {
  return (
    <article
      id={fase.id}
      style={{
        padding: "14px 14px 12px",
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        background: C.surface,
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: C.accent,
              marginBottom: 4,
            }}
          >
            Fase {fase.number}
          </div>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.35 }}>
            {fase.title}
          </h3>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[fase.status], flexShrink: 0 }}>
          {STATUS_LABEL[fase.status]}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.45 }}>{fase.summary}</p>
      <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
        {fase.items.map((item) => (
          <li key={item.id} style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
            {item.label}
          </li>
        ))}
      </ul>
    </article>
  );
}
