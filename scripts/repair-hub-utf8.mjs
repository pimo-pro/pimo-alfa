/**
 * Repara encoding UTF-8 (sem BOM) do Hub Documentação.
 * Usa apenas escapes \\u — seguro em qualquer codepage.
 */
import fs from "node:fs";
import path from "node:path";

const u = (...codes) => String.fromCodePoint(...codes);

// Common PT fragments
const Documentacao = "Documenta" + u(0xe7, 0xe3) + "o";
const Secao = "Sec" + u(0xe7) + u(0xe3) + "o";
const Secoes = "sec" + u(0xe7) + u(0xf5) + "es";
const Seccoes = "sec" + u(0xe7) + u(0xf5) + "es";
const Referencias = "Refer" + u(0xea) + "ncias";
const Referencia = "Refer" + u(0xea) + "ncia";
const Tecnicas = "T" + u(0xe9) + "cnicas";
const tecnicas = "t" + u(0xe9) + "cnicas";
const Conteudo = "Conte" + u(0xfa) + "do";
const Historico = "hist" + u(0xf3) + "rico";
const HistoricoCap = "Hist" + u(0xf3) + "rico";
const Codigo = "C" + u(0xf3) + "digo";
const Modulo = "M" + u(0xf3) + "dulo";
const Concluido = "Conclu" + u(0xed) + "do";
const concluidas = "conclu" + u(0xed) + "das";
const Proximas = "Pr" + u(0xf3) + "ximas";
const construcao = "constru" + u(0xe7) + u(0xe3) + "o";
const Indice = u(0xcd) + "ndice";
const pagina = "p" + u(0xe1) + "gina";
const Pagina = "P" + u(0xe1) + "gina";
const nao = "n" + u(0xe3) + "o";
const so = "s" + u(0xf3);
const ligacao = "liga" + u(0xe7) + u(0xe3) + "o";
const hibrido = "h" + u(0xed) + "brido";
const emdash = u(0x2014);
const Especificacoes = "Especifica" + u(0xe7) + u(0xf5) + "es";

function writeUtf8(rel, text) {
  const abs = path.resolve(rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  // UTF-8 sem BOM
  fs.writeFileSync(abs, text, { encoding: "utf8" });
}

// --- removed.json ---
const removed = [
  {
    id: "doc-page-documentation-tsx",
    title: Pagina + " Documentation.tsx (legado)",
    removedIn: "2025-06-01",
    replacedBy: "/painel-referencia (PainelReferencia)",
    notes:
      "Removida e substitu" +
      u(0xed) +
      "da pelo Painel de " +
      Referencia +
      " dedicado. Registo a partir do " +
      Historico +
      " interno do projeto.",
  },
  {
    id: "roadmap-semanal-legado",
    title: "Roadmap semanal (legado)",
    removedIn: "2025-08-01",
    replacedBy: "ProjectRoadmap / Phases",
    notes:
      "Planeamento semanal removido e substitu" +
      u(0xed) +
      "do por Phases com progresso global e por fase.",
  },
  {
    id: "left-panel-selecionar-caixa",
    title: Secao + " Selecionar Caixa do Projeto (painel esquerdo)",
    removedIn: "2025-04-01",
    replacedBy: null,
    notes:
      "Remo" +
      u(0xe7) +
      u(0xe3) +
      "o da " +
      Secoes.replace(/^s/, "s") +
      " do painel esquerdo por falta de utilidade no fluxo atual.".replace(
        "da seces",
        "da " + Secao.toLowerCase()
      ),
  },
  {
    id: "bottom-ultima-atualizacao",
    title:
      "Bloco " +
      u(0xda) +
      "ltima Atualiza" +
      u(0xe7) +
      u(0xe3) +
      "o (painel inferior)",
    removedIn: "2025-05-01",
    replacedBy: null,
    notes:
      "Bloco removido do painel inferior durante a consolida" +
      u(0xe7) +
      u(0xe3) +
      "o Cutlist / Financeiro.",
  },
  {
    id: "footer-botao-documentacao-orfao",
    title:
      "Bot" +
      u(0xe3) +
      "o footer " +
      Documentacao +
      " (" +
      u(0xf3) +
      "rf" +
      u(0xe3) +
      "o)",
    removedIn: "2026-07-25",
    replacedBy: Documentacao + " do Sistema " + u(0x2192) + " /documentacao (Hub)",
    notes:
      "Span sem onClick removido do Footer; a rota oficial permanece " +
      Documentacao +
      " do Sistema / Hub interno.",
  },
  {
    id: "documentacao-sistema-pagina-monolitica",
    title: "Documentacao.tsx monolitica (" + Conteudo.toLowerCase() + " inline)",
    removedIn: "2026-07-25",
    replacedBy:
      "Hub /documentacao + core/docs/archive (" + HistoricoCap + ")",
    notes:
      Conteudo +
      " legado migrado para arquivo tipado; a rota /documentacao passou a ser o Hub de " +
      Documentacao +
      " Interna.",
  },
];

// Fix the awkward secao note properly
removed[2].notes =
  "Remo" +
  u(0xe7) +
  u(0xe3) +
  "o da " +
  Secao.toLowerCase() +
  " do painel esquerdo por falta de utilidade no fluxo atual.";

removed[5].title =
  "Documentacao.tsx monol" +
  u(0xed) +
  "tica (" +
  Conteudo.toLowerCase() +
  " inline)";

writeUtf8("public/updates/removed.json", JSON.stringify(removed, null, 2) + "\n");

// --- hubSections (already mostly OK; ensure header comments) ---
writeUtf8(
  "src/pages/documentacao/hubSections.ts",
  `/**
 * ${Secoes.charAt(0).toUpperCase() + Secoes.slice(1)} do Hub de ${Documentacao} Interna (/documentacao).
 * Ids est${u(0xe1)}veis para hash e navega${u(0xe7)}${u(0xe3)}o.
 */

import type { IconName } from "@/components/icons";

export type HubSectionId =
  | "atual"
  | "historico"
  | "adicionados"
  | "removidos"
  | "progresso"
  | "refs"
  | "logs"
  | "planeamento";

export type HubSectionDef = {
  id: HubSectionId;
  label: string;
  blurb: string;
  icon: IconName;
};

export const HUB_SECTIONS: HubSectionDef[] = [
  {
    id: "atual",
    label: "${Documentacao} atual",
    blurb: "${Indice} curado e refer${u(0xea)}ncias vigentes",
    icon: "adminDocs",
  },
  {
    id: "historico",
    label: "${Documentacao} hist${u(0xf3)}rica",
    blurb: "Arquivo imut${u(0xe1)}vel migrado do legado",
    icon: "adminArchive",
  },
  {
    id: "adicionados",
    label: "Funcionalidades adicionadas",
    blurb: "Features publicadas (news.json)",
    icon: "highlight",
  },
  {
    id: "removidos",
    label: "Funcionalidades removidas",
    blurb: "Registo de itens descontinuados",
    icon: "delete",
  },
  {
    id: "progresso",
    label: "Progresso do projeto",
    blurb: "Estado de ${construcao} e fases",
    icon: "adminChart",
  },
  {
    id: "refs",
    label: "${Referencias} t${u(0xe9)}cnicas",
    blurb: "architectureIndex e m${u(0xf3)}dulos core",
    icon: "blueprint",
  },
  {
    id: "logs",
    label: "Logs internos",
    blurb: "Feed de releases e updates",
    icon: "adminBook",
  },
  {
    id: "planeamento",
    label: "Planeamento futuro",
    blurb: "Pr${u(0xf3)}ximas etapas e roadmap",
    icon: "adminChecklist",
  },
];

export const DEFAULT_HUB_SECTION: HubSectionId = "atual";

export function isHubSectionId(value: string): value is HubSectionId {
  return HUB_SECTIONS.some((s) => s.id === value);
}

export function parseHubSectionHash(hash: string): HubSectionId | null {
  const raw = hash.replace(/^#/, "").trim().toLowerCase();
  if (!raw) return null;
  return isHubSectionId(raw) ? raw : null;
}
`
);

// --- HubDocumentacaoInterna (layout full width + clean PT) ---
writeUtf8(
  "src/pages/documentacao/HubDocumentacaoInterna.tsx",
  `/**
 * Hub ${Documentacao} Interna ${emdash} ${hibrido} A+C.
 * Rota: /documentacao. Layout full-width / full-height responsivo.
 */

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import {
  AJUDA_PAGE_TOKENS as C,
  ajudaPageFont as font,
} from "../ajuda/ajudaPageTokens";
import {
  DEFAULT_HUB_SECTION,
  HUB_SECTIONS,
  parseHubSectionHash,
  type HubSectionId,
} from "./hubSections";
import HubHistoricoContent from "./HubHistoricoContent";
import HubAdicionadosContent from "./HubAdicionadosContent";
import HubLogsContent from "./HubLogsContent";
import HubRemovidosContent from "./HubRemovidosContent";
import HubRefsContent from "./HubRefsContent";
import HubProgressoContent from "./HubProgressoContent";

type HubDocumentacaoInternaProps = {
  /** ${Secao} inicial. Alias: defaultSection. */
  initialSection?: HubSectionId;
  /** Alias Admin embeds (equiv. a initialSection). */
  defaultSection?: HubSectionId;
  /**
   * Embed no Admin: respeita defaultSection/initialSection no mount
   * (${nao} deixa um hash residual de outra ${pagina} sobrescrever).
   * Continua a atualizar hash via replaceState ao navegar nas ${Secoes}.
   */
  embedded?: boolean;
};

export default function HubDocumentacaoInterna({
  initialSection,
  defaultSection,
  embedded = false,
}: HubDocumentacaoInternaProps) {
  const startSection = defaultSection ?? initialSection ?? DEFAULT_HUB_SECTION;
  const [active, setActive] = useState<HubSectionId>(startSection);

  useEffect(() => {
    if (embedded) {
      setActive(startSection);
      const next = \`#\${startSection}\`;
      if (window.location.hash !== next) {
        window.history.replaceState(null, "", \`\${window.location.pathname}\${next}\`);
      }
      return;
    }
    const fromHash = parseHubSectionHash(window.location.hash);
    if (fromHash) setActive(fromHash);
  }, [embedded, startSection]);

  const selectSection = useCallback((id: HubSectionId) => {
    setActive(id);
    const next = \`#\${id}\`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", \`\${window.location.pathname}\${next}\`);
    }
  }, []);

  const activeDef = HUB_SECTIONS.find((s) => s.id === active) ?? HUB_SECTIONS[0];

  return (
    <main
      style={{
        flex: 1,
        width: "100%",
        maxWidth: "none",
        minHeight: "100%",
        height: "100%",
        boxSizing: "border-box",
        overflowY: "auto",
        scrollBehavior: "smooth",
        background: C.bg,
        color: C.text,
        fontFamily: font,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "none",
          margin: 0,
          padding: "0 clamp(12px, 2vw, 28px) 48px",
          boxSizing: "border-box",
          minHeight: "100%",
        }}
      >
        <header
          style={{
            padding: "clamp(24px, 4vw, 40px) 0 24px",
            borderBottom: \`1px solid \${C.border}\`,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 12,
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              background: C.accentBg,
              color: C.accent,
              border: \`1px solid \${C.accentBd}\`,
            }}
          >
            ${Documentacao} interna
          </div>
          <h1
            style={{
              fontSize: "clamp(1.6rem, 3.5vw, 2.1rem)",
              fontWeight: 800,
              margin: "0 0 8px",
              letterSpacing: "-0.02em",
            }}
          >
            Hub de ${Documentacao} Interna
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: C.muted, maxWidth: "72ch", lineHeight: 1.55 }}>
            Hub A+C ${emdash} mapa de ${Secoes} e leitura editorial. ${Conteudo} ligado a
            ${Historico}, novidades, refs e progresso.
          </p>
        </header>

        <section
          aria-label="Mapa de ${Secoes}"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
            gap: 10,
            marginBottom: 28,
            width: "100%",
          }}
        >
          {HUB_SECTIONS.map((sec) => {
            const isActive = sec.id === active;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => selectSection(sec.id)}
                aria-pressed={isActive}
                style={{
                  textAlign: "left",
                  padding: "14px 14px 12px",
                  borderRadius: 10,
                  border: \`1px solid \${isActive ? C.accentBd : C.border}\`,
                  background: isActive ? C.accentBg : C.surface,
                  color: C.text,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Icon name={sec.icon} size={16} aria-hidden />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{sec.label}</span>
                </span>
                <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{sec.blurb}</span>
              </button>
            );
          })}
        </section>

        <div
          className="hub-doc-body"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(160px, 220px) minmax(0, 1fr)",
            gap: "clamp(12px, 2vw, 28px)",
            alignItems: "start",
            width: "100%",
          }}
        >
          <nav
            aria-label="${Indice} do hub"
            style={{
              position: "sticky",
              top: 12,
              padding: 10,
              borderRadius: 10,
              border: \`1px solid \${C.border}\`,
              background: C.surface,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {HUB_SECTIONS.map((sec) => {
              const isActive = sec.id === active;
              return (
                <button
                  key={\`nav-\${sec.id}\`}
                  type="button"
                  onClick={() => selectSection(sec.id)}
                  aria-current={isActive ? "page" : undefined}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    border: "none",
                    borderRadius: 6,
                    background: isActive ? C.accentBg : "transparent",
                    color: isActive ? C.text : C.muted,
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  {sec.label}
                </button>
              );
            })}
          </nav>

          <section
            id={active}
            aria-labelledby={\`hub-section-title-\${active}\`}
            style={{
              padding: "clamp(14px, 2vw, 22px)",
              borderRadius: 10,
              border: \`1px solid \${C.border}\`,
              background: C.surface,
              minHeight: 220,
              width: "100%",
              boxSizing: "border-box",
              minWidth: 0,
            }}
          >
            <h2
              id={\`hub-section-title-\${active}\`}
              style={{
                margin: "0 0 8px",
                fontSize: 16,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Icon name={activeDef.icon} size={18} aria-hidden />
              {activeDef.label}
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
              {activeDef.blurb}
            </p>
            {active === "historico" ? (
              <HubHistoricoContent />
            ) : active === "adicionados" ? (
              <HubAdicionadosContent />
            ) : active === "logs" ? (
              <HubLogsContent />
            ) : active === "removidos" ? (
              <HubRemovidosContent />
            ) : active === "refs" ? (
              <HubRefsContent />
            ) : active === "progresso" ? (
              <HubProgressoContent />
            ) : (
              <div
                data-hub-placeholder={active}
                style={{
                  padding: "20px 16px",
                  borderRadius: 8,
                  border: \`1px dashed \${C.border}\`,
                  fontSize: 12,
                  color: C.muted,
                  lineHeight: 1.55,
                }}
              >
                Placeholder ${emdash} ${Conteudo.toLowerCase()} desta ${Secao.toLowerCase()} ser${u(0xe1)} ligado nas fases seguintes
                (${Documentacao.toLowerCase()} atual / planeamento). Sem dados nesta fase.
              </div>
            )}
          </section>
        </div>
      </div>
      <style>{\`
        @media (max-width: 820px) {
          .hub-doc-body {
            grid-template-columns: 1fr !important;
          }
          .hub-doc-body > nav {
            position: static !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
          }
          .hub-doc-body > nav button {
            width: auto !important;
          }
        }
      \`}</style>
    </main>
  );
}
`
);

writeUtf8(
  "src/pages/documentacao/HubHistoricoContent.tsx",
  `/**
 * ${Conteudo} da ${Secao.toLowerCase()} ${HistoricoCap} ${emdash} dados locais tipados (sem fetch).
 * ${nao.charAt(0).toUpperCase() + nao.slice(1)} altera o chrome do hub; s${u(0xf3)} preenche o painel de ${Conteudo.toLowerCase()}.
 */

import { loadHistoricoArchive, type HistoricalDocEntry } from "@/core/docs/archive";
import { AJUDA_PAGE_TOKENS as C } from "../ajuda/ajudaPageTokens";

const KIND_LABEL: Record<HistoricalDocEntry["kind"], string> = {
  intro: "Intro",
  notes: "Notas",
  code: "${Codigo}",
  markdown: "Markdown",
  reference: "${Referencia}",
};

export default function HubHistoricoContent() {
  const entries = loadHistoricoArchive();

  return (
    <div
      data-hub-historico
      style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}
    >
      <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
        Arquivo ${Historico} migrado do legado ${Documentacao} do Sistema ({entries.length}{" "}
        entradas). Somente leitura ${emdash} sem ${ligacao} a Novidades nesta fase.
      </p>
      {entries.map((entry) => (
        <article
          key={entry.id}
          id={entry.id}
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            border: \`1px solid \${C.border}\`,
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
`
);

writeUtf8(
  "src/pages/documentacao/HubRefsContent.tsx",
  `/**
 * ${Secao} ${Referencias} ${Tecnicas} ${emdash} dados via loadHubRefs (local).
 */

import { useMemo, useState } from "react";
import { loadHubRefs, type HubRefEntry, type HubRefKind } from "@/core/docs/refs";
import { AJUDA_PAGE_TOKENS as C } from "../ajuda/ajudaPageTokens";

const KIND_LABEL: Record<HubRefKind, string> = {
  link: "Link",
  module: "${Modulo}",
  flow: "Fluxo",
  section: "${Secao}",
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
        ${Referencias} ${tecnicas} (architectureIndex, painelReferenciaSections, notas)
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
              border: \`1px solid \${filter === f ? C.accentBd : C.border}\`,
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
          border: \`1px solid \${C.border}\`,
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
        border: \`1px solid \${C.border}\`,
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
`
);

writeUtf8(
  "src/pages/documentacao/HubProgressoContent.tsx",
  `/**
 * ${Secao} Progresso do Projeto ${emdash} dados via loadHubProgresso (local).
 */

import { useMemo } from "react";
import {
  loadHubProgresso,
  type ProgressoItemStatus,
} from "@/core/docs/progresso";
import { AJUDA_PAGE_TOKENS as C } from "../ajuda/ajudaPageTokens";

const STATUS_LABEL: Record<ProgressoItemStatus, string> = {
  completed: "${Concluido}",
  "in-progress": "Em andamento",
  planned: "Planejado",
};

const STATUS_COLOR: Record<ProgressoItemStatus, string> = {
  completed: "var(--status-done-color, var(--ci-success, #22c55e))",
  "in-progress": "var(--ci-prussian-600, var(--blue-light, #3b82f6))",
  planned: "var(--status-progress-color, var(--ci-sienna-400, #f59e0b))",
};

export default function HubProgressoContent() {
  const data = useMemo(() => loadHubProgresso(), []);
  const { counters, sections, roadmap, concluidas, emAndamento, proximas } = data;

  return (
    <div data-hub-progresso style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
        Progresso do projeto ${emdash} ${Secoes} migradas + roadmap + resumo.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 110px), 1fr))",
          gap: 8,
          width: "100%",
        }}
      >
        <StatBox label="${Concluido}" value={String(counters.completed)} color={STATUS_COLOR.completed} />
        <StatBox label="Em andamento" value={String(counters.inProgress)} color={STATUS_COLOR["in-progress"]} />
        <StatBox label="Planejado" value={String(counters.planned)} color={STATUS_COLOR.planned} />
        <StatBox label="Progresso" value={\`\${counters.completionPercent}%\`} color={C.accent} />
        <StatBox label="Roadmap" value={\`\${roadmap.progress}%\`} color={C.accent} />
      </div>

      {roadmap.currentPhaseTitle ? (
        <p style={{ margin: 0, fontSize: 12, color: C.text }}>
          Phase atual: <strong>{roadmap.currentPhaseTitle}</strong>
          {"  "}
          {roadmap.doneTasks}/{roadmap.totalTasks} tarefas
        </p>
      ) : null}

      <ChecklistBlock title={\`Tarefas ${concluidas}\`} items={concluidas.map((t) => t.titulo)} />
      <ChecklistBlock title="Em andamento" items={emAndamento.map((t) => t.titulo)} />
      <ChecklistBlock title={\`${Proximas} etapas\`} items={proximas.map((t) => t.titulo)} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
        {sections.map((section) => (
          <article
            key={section.id}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: \`1px solid \${C.border}\`,
              background: C.bg,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 6,
                flexWrap: "wrap",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>
                {section.title}
              </h3>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: STATUS_COLOR[section.status],
                }}
              >
                {STATUS_LABEL[section.status]}
              </span>
            </div>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: C.muted }}>{section.description}</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {section.items.map((item) => (
                <li key={item.label} style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
                  <span style={{ color: STATUS_COLOR[item.status], fontWeight: 600 }}>
                    [{STATUS_LABEL[item.status]}]
                  </span>{" "}
                  {item.label}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: "10px 8px",
        borderRadius: 8,
        border: \`1px solid \${C.border}\`,
        background: C.bg,
        textAlign: "center",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ChecklistBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        border: \`1px solid \${C.border}\`,
        background: C.bg,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: C.text }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((item) => (
          <li key={item} style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
`
);

console.log("core UI + removed.json rewritten");
