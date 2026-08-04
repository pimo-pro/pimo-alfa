import fs from "node:fs";
import path from "node:path";

const BAK = "src/core/docs/archive/DocumentacaoSistemaLegacy.tsx.bak";
const OUT_DIR = "src/core/docs/archive";

const src = fs.readFileSync(BAK, "utf8");

function unescapeJsString(s) {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

function flattenBodyTextStyle(chunk) {
  const marker = "bodyTextStyle}>";
  const start = chunk.indexOf(marker);
  if (start < 0) return "";
  let region = chunk.slice(start + marker.length);
  const endDiv = region.indexOf("</div>");
  if (endDiv >= 0) region = region.slice(0, endDiv);

  let out = "";
  const re = /\{"((?:\\.|[^"\\])*)"\}|([^{]+)/g;
  let m;
  while ((m = re.exec(region))) {
    if (m[1] != null) out += unescapeJsString(m[1]);
    else if (m[2] != null) out += m[2];
  }
  return out
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractPre(chunk) {
  const pre = chunk.match(/<pre[\s\S]*?>\s*\{`([\s\S]*?)`\}\s*<\/pre>/);
  if (!pre) return null;
  let body = pre[1].replace(/\r\n/g, "\n");
  const after = chunk.match(
    /color: "var\(--text-muted\)"[^>]*>\s*([\s\S]*?)<\/div>\s*<\/Panel>/
  );
  if (after) {
    body +=
      "\n\n" +
      after[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
  }
  return body.trim();
}

function extractTemplateLiteral(chunk) {
  const tl = chunk.match(/\{`([\s\S]*?)`\}/);
  return tl ? tl[1].replace(/\r\n/g, "\n").trim() : null;
}

function extractMutedIntro(chunk) {
  const m = chunk.match(/text-muted[^>]*>\s*([\s\S]*?)<\/div>/);
  if (!m) return "";
  return m[1].replace(/\{[^}]+\}/g, "").replace(/\s+/g, " ").trim();
}

function extractExportString(ts, name) {
  const re = new RegExp("export const " + name + " = `([\\s\\S]*?)`;");
  const m = ts.match(re);
  return m ? m[1].replace(/\r\n/g, "\n").trim() : "";
}

function extractChangelogArray(ts) {
  const m = ts.match(/export const changelog = (\[[\s\S]*?\]);/);
  if (!m) return [];
  try {
    return Function('"use strict"; return (' + m[1] + ");")();
  } catch {
    return [];
  }
}

function extractFeaturesArray(ts) {
  const m = ts.match(/export const features = (\[[\s\S]*?\]);/);
  if (!m) return [];
  try {
    return Function('"use strict"; return (' + m[1] + ");")();
  } catch {
    return [];
  }
}

const titleMatches = [...src.matchAll(/<Panel title="([^"]+)">/g)];
const untitledMatches = [
  ...src.matchAll(/<Panel>\s*<div style=\{sectionTitleStyle\}>([^<]+)<\/div>/g),
];

const markers = [
  ...titleMatches.map((m) => ({
    title: m[1],
    index: m.index,
    typed: true,
  })),
  ...untitledMatches.map((m) => ({
    title: m[1].trim(),
    index: m.index,
    typed: false,
  })),
].sort((a, b) => a.index - b.index);

const panels = [];

for (let i = 0; i < markers.length; i++) {
  const start = markers[i].index;
  const end = i + 1 < markers.length ? markers[i + 1].index : src.length;
  const chunk = src.slice(start, end);
  const title = markers[i].title;

  if (!markers[i].typed) {
    panels.push({ title, body: "", kind: "reference", fromModule: true });
    continue;
  }

  // ASCII-safe: avoid mojibake in this script file
  if (/^Documenta.+do Sistema$/u.test(title)) {
    panels.push({ title, body: extractMutedIntro(chunk), kind: "intro" });
    continue;
  }

  if (title.includes("P3.9")) {
    panels.push({
      title,
      body: extractTemplateLiteral(chunk) || "",
      kind: "markdown",
    });
    continue;
  }

  const pre = extractPre(chunk);
  if (pre) {
    panels.push({ title, body: pre, kind: "code" });
    continue;
  }

  if (chunk.includes("<pre")) {
    const tl = extractTemplateLiteral(chunk);
    if (tl) {
      panels.push({ title, body: tl, kind: "code" });
      continue;
    }
  }

  panels.push({
    title,
    body: flattenBodyTextStyle(chunk),
    kind: "notes",
  });
}

const changelogSrc = fs.readFileSync("src/core/docs/changelog.ts", "utf8");
const specsSrc = fs.readFileSync("src/core/docs/specs.ts", "utf8");
const howSrc = fs.readFileSync("src/core/docs/howItWorks.ts", "utf8");
const featSrc = fs.readFileSync("src/core/docs/features.ts", "utf8");

const specsBody = extractExportString(specsSrc, "specs");
const howBody = extractExportString(howSrc, "howItWorks");
const changelogBody = JSON.stringify(extractChangelogArray(changelogSrc), null, 2);
const featuresBody = extractFeaturesArray(featSrc)
  .map((f) => "- " + f)
  .join("\n");

for (const p of panels) {
  if (!p.fromModule) continue;
  if (p.title === "Changelog") p.body = changelogBody;
  else if (/^Especifica/u.test(p.title)) p.body = specsBody;
  else if (p.title.startsWith("Como o Sistema")) p.body = howBody;
  else if (p.title.startsWith("O que o Sistema")) p.body = featuresBody;
}

function slug(title) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

const entries = panels.map((p, i) => ({
  id: "hist-" + String(i + 1).padStart(2, "0") + "-" + slug(p.title),
  title: p.title,
  kind: p.kind,
  body: p.body,
  source: "DocumentacaoSistemaLegacy",
}));

fs.writeFileSync(
  path.join(OUT_DIR, "_extract_preview.json"),
  JSON.stringify(panels, null, 2),
  "utf8"
);

const typesTs = `/**
 * Tipos do arquivo historico (Fase 4).
 * Conteudo migrado de DocumentacaoSistemaLegacy — so leitura.
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
  /** Corpo textual migrado do legado (nao reescrito). */
  body: string;
  source: "DocumentacaoSistemaLegacy";
};
`;

const docsTs =
  `/**
 * Entradas historicas tipadas — migracao 1:1 do legado Documentacao.tsx.
 * Gerado a partir de DocumentacaoSistemaLegacy.tsx.bak (Fase 4).
 */

import type { HistoricalDocEntry } from "./historicoTypes";

export const HISTORICO_DOCS: HistoricalDocEntry[] = ` +
  JSON.stringify(entries, null, 2) +
  ";\n";

const loaderTs = `/**
 * Loader local do arquivo historico (sem fetch).
 */

import { HISTORICO_DOCS } from "./historicoDocs";
import type { HistoricalDocEntry, HistoricalDocKind } from "./historicoTypes";

export type { HistoricalDocEntry, HistoricalDocKind };

export function loadHistoricoArchive(): HistoricalDocEntry[] {
  return HISTORICO_DOCS;
}

export function loadHistoricoByKind(kind: HistoricalDocKind): HistoricalDocEntry[] {
  return HISTORICO_DOCS.filter((e) => e.kind === kind);
}

export function getHistoricoEntry(id: string): HistoricalDocEntry | undefined {
  return HISTORICO_DOCS.find((e) => e.id === id);
}
`;

const indexTs = `/**
 * Arquivo historico da Documentacao do Sistema (legado).
 */

export type { HistoricalDocEntry, HistoricalDocKind } from "./historicoTypes";
export { HISTORICO_DOCS } from "./historicoDocs";
export {
  loadHistoricoArchive,
  loadHistoricoByKind,
  getHistoricoEntry,
} from "./loadHistoricoArchive";
`;

fs.writeFileSync(path.join(OUT_DIR, "historicoTypes.ts"), typesTs, "utf8");
fs.writeFileSync(path.join(OUT_DIR, "historicoDocs.ts"), docsTs, "utf8");
fs.writeFileSync(path.join(OUT_DIR, "loadHistoricoArchive.ts"), loaderTs, "utf8");
fs.writeFileSync(path.join(OUT_DIR, "index.ts"), indexTs, "utf8");

for (const p of panels) {
  console.log(
    String(p.kind).padEnd(10),
    String(p.body.length).padStart(6),
    p.title
  );
}
console.log("entries", entries.length, "specsLen", specsBody.length);
