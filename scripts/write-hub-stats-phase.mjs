/**
 * Regrava hubSections + HubDocumentacaoInterna + stats (UTF-8 via \\u).
 */
import fs from "node:fs";

const u = (...c) => String.fromCodePoint(...c);
const D = "Documenta" + u(0xe7, 0xe3) + "o";
const Secoes = "sec" + u(0xe7) + u(0xf5) + "es";
const Secao = "Sec" + u(0xe7) + u(0xe3) + "o";
const em = u(0x2014);
const hibrido = "h" + u(0xed) + "brido";
const Conteudo = "Conte" + u(0xfa) + "do";
const historico = "hist" + u(0xf3) + "rico";
const Indice = u(0xcd) + "ndice";
const nao = "n" + u(0xe3) + "o";
const pagina = "p" + u(0xe1) + "gina";
const estaveis = "est" + u(0xe1) + "veis";
const navegacao = "navega" + u(0xe7) + u(0xe3) + "o";
const referencias = "refer" + u(0xea) + "ncias";
const Referencias = "Refer" + u(0xea) + "ncias";
const historica = "hist" + u(0xf3) + "rica";
const imutavel = "imut" + u(0xe1) + "vel";
const construcao = "constru" + u(0xe7) + u(0xe3) + "o";
const tecnicas = "t" + u(0xe9) + "cnicas";
const modulos = "m" + u(0xf3) + "dulos";
const Proximas = "Pr" + u(0xf3) + "ximas";
const Estatisticas = "Estat" + u(0xed) + "sticas";
const Ultimo = u(0xda) + "ltimo";

function w(p, t) {
  fs.writeFileSync(p, t, "utf8");
}

w(
  "src/pages/documentacao/hubSections.ts",
  `/**
 * ${Secoes.charAt(0).toUpperCase() + Secoes.slice(1)} do Hub de ${D} Interna (/documentacao).
 * Ids ${estaveis} para hash e ${navegacao}.
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
    label: "${D} atual",
    blurb: "${Indice} curado e ${referencias} vigentes",
    icon: "adminDocs",
  },
  {
    id: "historico",
    label: "${D} ${historica}",
    blurb: "Arquivo ${imutavel} migrado do legado",
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
    label: "${Referencias} ${tecnicas}",
    blurb: "architectureIndex e ${modulos} core",
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
    blurb: "${Proximas} etapas e roadmap",
    icon: "adminChecklist",
  },
];

/** ${Secao} inicial de /documentacao quando ${nao} h${u(0xe1)} hash (e sem override Admin). */
export const DEFAULT_HUB_SECTION: HubSectionId = "progresso";

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

w(
  "src/pages/documentacao/loadHubStats.ts",
  `/**
 * Loader local de ${Estatisticas} do Projeto (Hub ${D}).
 * Sem fetch ${em} snapshot est${u(0xe1)}tico dos KPIs oficiais mais recentes.
 */

export type HubStatTone = "neutral" | "blue" | "green";

export type HubStatIcon = "code" | "files" | "projects" | "designer" | "dev" | "ai";

export type HubStatDelta = {
  /** Percentagem j${u(0xe1)} formatada (ex.: "306,5%"). */
  percentLabel: string;
  /** Dire${u(0xe7)}${u(0xe3)}o do indicador. */
  direction: "up" | "down" | "flat";
};

export type HubStatCard = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  icon: HubStatIcon;
  tone: HubStatTone;
  delta?: HubStatDelta;
};

export type HubStatsSnapshot = {
  sourceLabel: string;
  cards: HubStatCard[];
};

/** Valores oficiais do ${Ultimo.toLowerCase()} scan VS Code + Clin + ops internas. */
export function loadHubStats(): HubStatsSnapshot {
  return {
    sourceLabel: "${Ultimo} scan VS Code + Clin ${u(0xb7)} ops internas",
    cards: [
      {
        id: "loc",
        label: "Linhas de c${u(0xf3)}digo",
        value: "297.871",
        hint: "Scan de c${u(0xf3)}digo",
        icon: "code",
        tone: "blue",
        delta: { percentLabel: "306,5%", direction: "up" },
      },
      {
        id: "files",
        label: "Arquivos",
        value: "2.027",
        hint: "Scan de c${u(0xf3)}digo",
        icon: "files",
        tone: "blue",
        delta: { percentLabel: "324,9%", direction: "up" },
      },
      {
        id: "projects",
        label: "Projetos criados",
        value: "0",
        hint: "Campo novo ${em} placeholder",
        icon: "projects",
        tone: "neutral",
      },
      {
        id: "designers",
        label: "Designers ativos",
        value: "1",
        icon: "designer",
        tone: "neutral",
      },
      {
        id: "devs",
        label: "Programadores ativos",
        value: "1",
        icon: "dev",
        tone: "neutral",
      },
      {
        id: "agents",
        label: "Agentes de IA ativos",
        value: "6",
        icon: "ai",
        tone: "green",
      },
    ],
  };
}
`
);

w(
  "src/pages/documentacao/HubStatsContent.tsx",
  `/**
 * Bloco de ${Estatisticas} do Projeto ${em} topo do Hub (${hibrido} A+C).
 * Dados via loadHubStats (local, sem fetch).
 */

import { useMemo } from "react";
import { AJUDA_PAGE_TOKENS as C } from "../ajuda/ajudaPageTokens";
import {
  loadHubStats,
  type HubStatCard,
  type HubStatIcon,
  type HubStatTone,
} from "./loadHubStats";

const TONE: Record<
  HubStatTone,
  { icon: string; chip: string; chipBd: string; chipBg: string }
> = {
  neutral: {
    icon: C.muted,
    chip: C.muted,
    chipBd: C.border,
    chipBg: "transparent",
  },
  blue: {
    icon: C.accent,
    chip: C.accent,
    chipBd: C.accentBd,
    chipBg: C.accentBg,
  },
  green: {
    icon: "var(--status-done-color, var(--ci-success, #22c55e))",
    chip: "var(--status-done-color, var(--ci-success, #22c55e))",
    chipBd: "color-mix(in srgb, var(--status-done-color, var(--ci-success, #22c55e)) 35%, transparent)",
    chipBg: "color-mix(in srgb, var(--status-done-color, var(--ci-success, #22c55e)) 12%, transparent)",
  },
};

const UP_GREEN = "var(--status-done-color, var(--ci-success, #22c55e))";

export default function HubStatsContent() {
  const snapshot = useMemo(() => loadHubStats(), []);

  return (
    <section
      data-hub-stats
      aria-label="${Estatisticas} do Projeto"
      style={{
        width: "100%",
        marginBottom: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
          ${Estatisticas} do Projeto
        </h2>
        <span style={{ fontSize: 11, color: C.muted }}>{snapshot.sourceLabel}</span>
      </div>

      <div
        className="hub-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: 10,
          width: "100%",
        }}
      >
        {snapshot.cards.map((card) => (
          <StatCard key={card.id} card={card} />
        ))}
      </div>

      <style>{\`
        @media (max-width: 820px) {
          .hub-stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      \`}</style>
    </section>
  );
}

function StatCard({ card }: { card: HubStatCard }) {
  const tone = TONE[card.tone];
  return (
    <article
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "14px 14px 12px",
        borderRadius: 10,
        border: \`1px solid \${C.border}\`,
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
            border: \`1px solid \${tone.chipBd}\`,
            background: tone.chipBg,
            color: tone.icon,
          }}
        >
          <StatIcon name={card.icon} />
        </span>
        {card.delta && card.delta.direction === "up" ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: UP_GREEN,
              letterSpacing: "0.02em",
            }}
          >
            ${u(0x2191)} {card.delta.percentLabel}
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
          <div style={{ marginTop: 2, fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{card.hint}</div>
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
          <path d="M5.6 5.6l2.1 2.1" />
          <path d="M16.3 16.3l2.1 2.1" />
          <path d="M18.4 5.6l-2.1 2.1" />
          <path d="M7.7 16.3l-2.1 2.1" />
        </svg>
      );
    default:
      return null;
  }
}
`
);

// Hub shell with stats + progresso default
w(
  "src/pages/documentacao/HubDocumentacaoInterna.tsx",
  `/**
 * Hub ${D} Interna ${em} ${hibrido} A+C.
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
import HubStatsContent from "./HubStatsContent";

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

function resolveStartSection(
  embedded: boolean,
  defaultSection?: HubSectionId,
  initialSection?: HubSectionId
): HubSectionId {
  const fallback = defaultSection ?? initialSection ?? DEFAULT_HUB_SECTION;
  if (embedded) return fallback;
  if (typeof window === "undefined") return fallback;
  const fromHash = parseHubSectionHash(window.location.hash);
  return fromHash ?? fallback;
}

export default function HubDocumentacaoInterna({
  initialSection,
  defaultSection,
  embedded = false,
}: HubDocumentacaoInternaProps) {
  const startSection = resolveStartSection(embedded, defaultSection, initialSection);
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
    if (fromHash) {
      setActive(fromHash);
      return;
    }
    // Sem hash: Progresso do Projeto ${u(0xe9)} a ${Secao.toLowerCase()} inicial oficial.
    setActive(DEFAULT_HUB_SECTION);
    const next = \`#\${DEFAULT_HUB_SECTION}\`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", \`\${window.location.pathname}\${next}\`);
    }
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
            ${D} interna
          </div>
          <h1
            style={{
              fontSize: "clamp(1.6rem, 3.5vw, 2.1rem)",
              fontWeight: 800,
              margin: "0 0 8px",
              letterSpacing: "-0.02em",
            }}
          >
            Hub de ${D} Interna
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: C.muted, maxWidth: "72ch", lineHeight: 1.55 }}>
            Hub A+C ${em} mapa de ${Secoes} e leitura editorial. ${Conteudo} ligado a
            ${historico}, novidades, refs e progresso.
          </p>
        </header>

        <HubStatsContent />

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
                Placeholder ${em} ${Conteudo.toLowerCase()} desta ${Secao.toLowerCase()} ser${u(0xe1)} ligado nas fases seguintes
                (${D.toLowerCase()} atual / planeamento). Sem dados nesta fase.
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

console.log("rewrote hub shell + stats + hubSections");
