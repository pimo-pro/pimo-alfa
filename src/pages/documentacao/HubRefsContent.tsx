/**
 * Secção Referências Técnicas — dados via loadHubRefs (local).
 */

import { useMemo, useState } from "react";
import { loadHubRefs, type HubRefEntry, type HubRefKind } from "@/core/docs/refs";
import { AJUDA_PAGE_TOKENS as C } from "../ajuda/ajudaPageTokens";

const KIND_LABEL: Record<HubRefKind, string> = {
  link: "Link",
  module: "Módulo",
  flow: "Fluxo",
  section: "Secção",
  note: "Nota",
  structure: "Estrutura",
};

const FILTERS: Array<HubRefKind | "all"> = [
  "all",
  "link",
  "module",
  "flow",
  "section",
  "note",
];

export default function HubRefsContent() {
  const snapshot = useMemo(() => loadHubRefs(), []);
  const [filter, setFilter] = useState<HubRefKind | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const entries =
    filter === "all"
      ? snapshot.entries
      : snapshot.entries.filter((e) => e.kind === filter);

  return (
    <div data-hub-refs style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
      <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
        Referências técnicas (architectureIndex, painelReferenciaSections, notas)
        {snapshot.entries.length} entradas.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, width: "100%" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: `1px solid ${filter === f ? C.accentBd : C.border}`,
              background: filter === f ? C.accentBg : C.bg,
              color: filter === f ? C.text : C.muted,
              fontSize: 11,
              fontWeight: filter === f ? 700 : 500,
              cursor: "pointer",
            }}
          >
            {f === "all" ? "Todas" : KIND_LABEL[f]}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
          gap: 10,
          width: "100%",
        }}
      >
        {entries.map((entry) => (
          <RefCard
            key={entry.id}
            entry={entry}
            open={openId === entry.id}
            onToggle={() => setOpenId((id) => (id === entry.id ? null : entry.id))}
          />
        ))}
      </div>

      <details
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "10px 12px",
          background: C.bg,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: C.text }}>
          Estrutura de pastas
        </summary>
        <pre
          style={{
            margin: "10px 0 0",
            fontSize: 11,
            lineHeight: 1.45,
            color: C.muted,
            whiteSpace: "pre-wrap",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
        >
          {snapshot.folderStructure}
        </pre>
      </details>
    </div>
  );
}

function RefCard({
  entry,
  open,
  onToggle,
}: {
  entry: HubRefEntry;
  open: boolean;
  onToggle: () => void;
}) {
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
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.35 }}>
          {entry.title}
        </h3>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
          {KIND_LABEL[entry.kind]}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.45 }}>{entry.summary}</p>
      {entry.paths && entry.paths.length > 0 ? (
        <div style={{ fontSize: 11, color: C.muted }}>{entry.paths.slice(0, 3).join("  ")}</div>
      ) : null}
      {entry.details ? (
        <button
          type="button"
          onClick={onToggle}
          style={{
            alignSelf: "flex-start",
            border: "none",
            background: "transparent",
            color: C.accent,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {open ? "Ocultar detalhe" : "Ver detalhe"}
        </button>
      ) : null}
      {open && entry.details ? (
        <pre
          style={{
            margin: 0,
            fontSize: 11,
            lineHeight: 1.5,
            color: C.text,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {entry.details}
        </pre>
      ) : null}
    </article>
  );
}
