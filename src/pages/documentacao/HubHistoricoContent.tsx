/**
 * Conteúdo da secção Histórico — dados locais tipados (sem fetch).
 * Não altera o chrome do hub; só preenche o painel de conteúdo.
 */

import { loadHistoricoArchive, type HistoricalDocEntry } from "@/core/docs/archive";
import { AJUDA_PAGE_TOKENS as C } from "../ajuda/ajudaPageTokens";

const KIND_LABEL: Record<HistoricalDocEntry["kind"], string> = {
  intro: "Intro",
  notes: "Notas",
  code: "Código",
  markdown: "Markdown",
  reference: "Referência",
};

export default function HubHistoricoContent() {
  const entries = loadHistoricoArchive();

  return (
    <div
      data-hub-historico
      style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}
    >
      <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
        Arquivo histórico migrado do legado Documentação do Sistema ({entries.length}{" "}
        entradas). Somente leitura — sem ligação a Novidades nesta fase.
      </p>
      {entries.map((entry) => (
        <article
          key={entry.id}
          id={entry.id}
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: C.bg,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 700,
                color: C.text,
              }}
            >
              {entry.title}
            </h3>
            <span
              style={{
                flexShrink: 0,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: C.accent,
              }}
            >
              {KIND_LABEL[entry.kind]}
            </span>
          </div>
          <pre
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color: C.text,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily:
                entry.kind === "code"
                  ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  : "inherit",
            }}
          >
            {entry.body || "(vazio)"}
          </pre>
        </article>
      ))}
    </div>
  );
}
