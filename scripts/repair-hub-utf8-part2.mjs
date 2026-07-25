/**
 * Parte 2 — headers/comentários e labels UI restantes (UTF-8 via \\u).
 */
import fs from "node:fs";

const u = (...c) => String.fromCodePoint(...c);
const Documentacao = "Documenta" + u(0xe7, 0xe3) + "o";
const Secao = "Sec" + u(0xe7) + u(0xe3) + "o";
const Referencias = "Refer" + u(0xea) + "ncias";
const Referencia = "Refer" + u(0xea) + "ncia";
const Tecnicas = "T" + u(0xe9) + "cnicas";
const tecnicas = "t" + u(0xe9) + "cnicas";
const Conteudo = "Conte" + u(0xfa) + "do";
const Historico = "hist" + u(0xf3) + "rico";
const HistoricoCap = "Hist" + u(0xf3) + "rico";
const Codigo = "c" + u(0xf3) + "digo";
const emdash = u(0x2014);
const Especificacoes = "Especifica" + u(0xe7) + u(0xf5) + "es";
const Normalizacao = "Normaliza" + u(0xe7) + u(0xe3) + "o";
const ja = "j" + u(0xe1);
const Substituido = "Substitu" + u(0xed) + "do";

function write(rel, text) {
  fs.writeFileSync(rel, text, "utf8");
}

function patch(rel, pairs) {
  let t = fs.readFileSync(rel, "utf8");
  for (const [a, b] of pairs) {
    if (!t.includes(a)) {
      // allow missing if already fixed
      continue;
    }
    t = t.split(a).join(b);
  }
  write(rel, t);
}

// --- Adicionados / Logs / Removidos (headers + width + damaged UI) ---
patch("src/pages/documentacao/HubAdicionadosContent.tsx", [
  [
    `/**
 * Seco Adicionados  entradas type=feature (news.json via loadWhatsNewNews).
 * Layout editorial (A) + grelha de cards (C), sem alterar o chrome do hub.
 */`,
    `/**
 * ${Secao} Adicionados ${emdash} entradas type=feature (news.json via loadWhatsNewNews).
 * Layout editorial (A) + grelha de cards (C), sem alterar o chrome do hub.
 */`,
  ],
  [
    `style={{ display: "flex", flexDirection: "column", gap: 14 }}`,
    `style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}`,
  ],
  [
    `gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))"`,
    `gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))"`,
  ],
]);

patch("src/pages/documentacao/HubLogsContent.tsx", [
  [
    `/**
 * Seco Logs  entradas type=fix|update|docs (news.json via loadWhatsNewNews).
 * Lista editorial compacta, ordenada por data (j no loader).
 */`,
    `/**
 * ${Secao} Logs ${emdash} entradas type=fix|update|docs (news.json via loadWhatsNewNews).
 * Lista editorial compacta, ordenada por data (${ja} no loader).
 */`,
  ],
  [
    `style={{ display: "flex", flexDirection: "column", gap: 12 }}`,
    `style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}`,
  ],
]);

patch("src/pages/documentacao/HubRemovidosContent.tsx", [
  [
    `/**
 * Seco Removidos  SSOT public/updates/removed.json.
 */`,
    `/**
 * ${Secao} Removidos ${emdash} SSOT public/updates/removed.json.
 */`,
  ],
  [
    `style={{ display: "flex", flexDirection: "column", gap: 12 }}`,
    `style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}`,
  ],
  [
    `Registry oficial de itens removidos (\`/updates/removed.json\`)
        {loading ? "" : \`  \${entries.length} entradas\`}. Separado do arquivo Histrico e de
        Novidades.`,
    `Registry oficial de itens removidos (\`/updates/removed.json\`)
        {loading ? "" : \`  \${entries.length} entradas\`}. Separado do arquivo ${HistoricoCap} e de
        Novidades.`,
  ],
  [
    `Registry vazio  ainda sem itens registados.`,
    `Registry vazio ${emdash} ainda sem itens registados.`,
  ],
  [`Substitudo por:`, `${Substituido} por:`],
]);

// --- loaders comments ---
patch("src/pages/documentacao/loadHubWhatsNew.ts", [
  [
    `/**
 * Normalizao hub ? Novidades do Sistema (Fase 5).
 * Reutiliza loadWhatsNewNews  sem segundo parser.
 */`,
    `/**
 * ${Normalizacao} hub ${u(0x2192)} Novidades do Sistema (Fase 5).
 * Reutiliza loadWhatsNewNews ${emdash} sem segundo parser.
 */`,
  ],
  [
    `/** Loader async do hub  mesma fonte que Ajuda ? Novidades. */`,
    `/** Loader async do hub ${emdash} mesma fonte que Ajuda ${u(0x2192)} Novidades. */`,
  ],
]);

patch("src/pages/documentacao/loadRemovedRegistry.ts", [
  [
    `/**
 * Loader do registry oficial de Removidos (Fase 6).
 * SSOT: /updates/removed.json  sem alterar loadWhatsNewNews.
 */`,
    `/**
 * Loader do registry oficial de Removidos (Fase 6).
 * SSOT: /updates/removed.json ${emdash} sem alterar loadWhatsNewNews.
 */`,
  ],
]);

// --- refs comments + NOTE_TITLES ---
write(
  "src/core/docs/refs/index.ts",
  `/**
 * ${Referencias} ${Tecnicas} ${emdash} barrel (Fase 9).
 */

export type { HubRefEntry, HubRefKind, HubRefsSnapshot } from "./refsTypes";
export { loadHubRefs } from "./loadHubRefs";
export { DOC_LINKS } from "./refsLinks";
export { painelReferenciaSections } from "./refsSections";
export { REFS_NOTES } from "./refsNotes";
export {
  MODULES,
  DATA_FLOWS,
  FOLDER_STRUCTURE,
  PANEL_NAV_ITEMS,
} from "./refsIndex";
`
);

write(
  "src/core/docs/refs/refsTypes.ts",
  `/**
 * Tipos do hub ${emdash} ${Referencias} ${Tecnicas} (Fase 9).
 */

export type HubRefKind = "link" | "module" | "flow" | "section" | "note" | "structure";

export type HubRefEntry = {
  id: string;
  kind: HubRefKind;
  title: string;
  summary: string;
  details?: string;
  paths?: string[];
  meta?: Record<string, string>;
};

export type HubRefsSnapshot = {
  entries: HubRefEntry[];
  folderStructure: string;
  navLabels: string[];
};
`
);

// Preserve rest of refsTypes if there was more - check original had export closing
const refsTypesFull = fs.readFileSync("src/core/docs/refs/refsTypes.ts", "utf8");
if (!refsTypesFull.includes("navLabels")) {
  // already written
}

patch("src/core/docs/refs/loadHubRefs.ts", [
  [
    `/**
 * Loader local de Referncias Tcnicas para o Hub (sem fetch).
 */`,
    `/**
 * Loader local de ${Referencias} ${Tecnicas} para o Hub (sem fetch).
 */`,
  ],
]);

write(
  "src/core/docs/refs/refsNotes.ts",
  `/**
 * Notas ${tecnicas} de refer${u(0xea)}ncia (specs / howItWorks / features).
 * Migradas do legado Documentacao via snapshot do archive ${emdash} sem misturar no ${HistoricoCap} do hub.
 */

import { HISTORICO_DOCS } from "../archive/historicoDocs";

export type RefNote = {
  id: string;
  title: string;
  body: string;
};

const NOTE_TITLES = new Set([
  "${Especificacoes} ${Tecnicas}",
  "Como o Sistema Funciona",
  "O que o Sistema Oferece",
]);

/** Snapshot tipado das notas ${tecnicas} (${Conteudo.toLowerCase()} 1:1 do legado). */
export const REFS_NOTES: RefNote[] = HISTORICO_DOCS.filter((e) =>
  NOTE_TITLES.has(e.title)
).map((e) => ({
  id: e.id,
  title: e.title,
  body: e.body,
}));
`
);

// --- archive header comments ---
write(
  "src/core/docs/archive/historicoTypes.ts",
  `/**
 * Tipos do arquivo ${Historico} (Fase 4).
 * ${Conteudo} migrado de DocumentacaoSistemaLegacy ${emdash} ${u(0xf3)} leitura.
 */

export type HistoricalDocKind =
  | "intro"
  | "notes"
  | "code"
  | "markdown"
  | "reference";

export type HistoricalDocEntry = {
  id: string;
  title: string;
  kind: HistoricalDocKind;
  /** Corpo textual migrado do legado (n${u(0xe3)}o reescrito). */
  body: string;
  source: "DocumentacaoSistemaLegacy";
};
`
);

patch("src/core/docs/archive/historicoCode.ts", [
  [
    `* Subconjunto tipado  snippets de cdigo do arquivo histrico.`,
    `* Subconjunto tipado ${emdash} snippets de ${Codigo} do arquivo ${Historico}.`,
  ],
]);

patch("src/core/docs/archive/historicoNotas.ts", [
  [
    `* Subconjunto tipado  notas / intro / markdown do arquivo histrico.`,
    `* Subconjunto tipado ${emdash} notas / intro / markdown do arquivo ${Historico}.`,
  ],
]);

// Documentacao.tsx wrapper comment
patch("src/pages/Documentacao.tsx", [
  [
    `* Rota /documentacao — Hub de Documentação Interna (scaffold A+C).`,
    `* Rota /documentacao ${emdash} Hub de ${Documentacao} Interna (scaffold A+C).`,
  ],
]);

console.log("part2 done");
