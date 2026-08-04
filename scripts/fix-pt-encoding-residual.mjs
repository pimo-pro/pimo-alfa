#!/usr/bin/env node
/**
 * Pass residual: FFFD restantes apos fix-pt-encoding + contextual.
 * Apenas escapes \\u. Nao toca CNC/XML/cutlist.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const F = "\uFFFD";
const SKIP_DIR = new Set([
  "node_modules", "dist", "build", ".git", "coverage", "tmp", "data",
  "ANTUNIS", "cnc", "cnc-examples-output",
]);
const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".html", ".css", ".txt", ".yml", ".yaml"]);

/** @type {Array<[string, string]>} */
const PAIRS = [];
const add = (...partsAndTo) => {
  const to = partsAndTo[partsAndTo.length - 1];
  const from = partsAndTo.slice(0, -1).join("");
  if (from && from !== to && from !== F) PAIRS.push([from, to]);
};

// uppercase / residual cao
add("SEC", F, F, "O", "SEC\u00C7\u00C3O");
add("SEC", F, "O", "SEC\u00C7\u00C3O");
add("INFORMA", F, F, "ES", "INFORMA\u00C7\u00D5ES");
add("INFORMA", F, "ES", "INFORMA\u00C7\u00D5ES");
add("PROTEC", F, F, "O", "PROTEC\u00C7\u00C3O");
add("PROTEC", "\u00E9", F, "O", "PROTEC\u00C7\u00C3O");
add("PROTEC", F, "O", "PROTEC\u00C7\u00C3O");
add("distribui", F, "o", "distribui\u00E7\u00E3o");
add("Distribui", F, "o", "Distribui\u00E7\u00E3o");
add("DISTRIBUI", F, "O", "DISTRIBUI\u00C7\u00C3O");
add("Otimiza", F, "o", "Otimiza\u00E7\u00E3o");
add("otimiza", F, "o", "otimiza\u00E7\u00E3o");
add("Sugest", F, "es", "Sugest\u00F5es");
add("sugest", F, "es", "sugest\u00F5es");
add("Sugest\u00E1es", "Sugest\u00F5es");
add("Recomenda", F, "es", "Recomenda\u00E7\u00F5es");
add("recomenda", F, "es", "recomenda\u00E7\u00F5es");
add("servi", F, "o", "servi\u00E7o");
add("Servi", F, "o", "Servi\u00E7o");
add("Persist", F, "ncia", "Persist\u00EAncia");
add("persist", F, "ncia", "persist\u00EAncia");
add("superf", F, "cies", "superf\u00EDcies");
add("superf", F, "cie", "superf\u00EDcie");
add("prim", F, "rio", "prim\u00E1rio");
add("Prim", F, "rio", "Prim\u00E1rio");
add("prim", F, "ria", "prim\u00E1ria");
add("secund", F, "ria", "secund\u00E1ria");
add("Secund", F, "ria", "Secund\u00E1ria");
add("secund", F, "rio", "secund\u00E1rio");
add("met", F, "lica", "met\u00E1lica");
add("Met", F, "lica", "Met\u00E1lica");
add("met", F, "lico", "met\u00E1lico");
add("t", F, "picos", "t\u00EDpicos");
add("t", F, "pico", "t\u00EDpico");
add("T", F, "pico", "T\u00EDpico");
add("Gen", F, "rica", "Gen\u00E9rica");
add("gen", F, "rica", "gen\u00E9rica");
add("atribu", F, "do", "atribu\u00EDdo");
add("atribu", F, "da", "atribu\u00EDda");
add("cr", F, "tico", "cr\u00EDtico");
add("Cr", F, "tico", "Cr\u00EDtico");
add("cr", F, "tica", "cr\u00EDtica");
add("p", F, "blica", "p\u00FAblica");
add("P", F, "blica", "P\u00FAblica");
add("p", F, "blico", "p\u00FAblico");
add("carca", F, "a", "carca\u00E7a");
add("Carca", F, "a", "Carca\u00E7a");
add("propor", F, "oes", "propor\u00E7\u00F5es");
add("propor", F, "\u00F5es", "propor\u00E7\u00F5es");
add("correc", F, "\u00E3o", "corre\u00E7\u00E3o");
add("correc", F, "ao", "corre\u00E7\u00E3o");
add("Correc", F, "\u00E3o", "Corre\u00E7\u00E3o");
add("seleccion", F, "vel", "seleccion\u00E1vel");
add("seleccion", F, "veis", "seleccion\u00E1veis");
add("h", F, " drill", "h\u00E1 drill");
add("n", F, "o h", "n\u00E3o h");
add("W?", "13 (", F, "/largura", "W?13 (\u00D8/largura");
add("(", F, "/largura", "(\u00D8/largura");
add("acento", F, "", "acento");
add("acento,", "acento,");
add("prim", F, "rio,", "prim\u00E1rio,");
add("acento", "s, texto, prim", F, "rio", "acentos, texto, prim\u00E1rio");

// docs / reports leftovers
add("SE", F, F, "O", "SEC\u00C7\u00C3O"); // risky? SEÇÃO without C - only if SEO
add("An", F, "lise", "An\u00E1lise");
add("an", F, "lise", "an\u00E1lise");
add("conclu", F, "da", "conclu\u00EDda");
add("conclu", F, "das", "conclu\u00EDdas");
add("inclu", F, "do", "inclu\u00EDdo");
add("inclu", F, "da", "inclu\u00EDda");
add("exclud", F, "do", "exclu\u00EDdo");
add("exclu", F, "do", "exclu\u00EDdo");
add("possu", F, "", "possu\u00ED");
add("sa", F, "da", "sa\u00EDda");
add("sa", F, "das", "sa\u00EDdas");
add("entr", F, "da", "entr\u00E1da");
add("Entr", F, "da", "Entr\u00E1da");
add("m", F, "dia", "m\u00E9dia");
add("M", F, "dia", "M\u00E9dia");
add("m", F, "dio", "m\u00E9dio");
add("r", F, "pida", "r\u00E1pida");
add("r", F, "pido", "r\u00E1pido");
add("b", F, "sica", "b\u00E1sica");
add("b", F, "sico", "b\u00E1sico");
add("pr", F, "tica", "pr\u00E1tica");
add("pr", F, "tico", "pr\u00E1tico");
add("espec", F, "fica", "espec\u00EDfica");
add("espec", F, "fico", "espec\u00EDfico");
add("espec", F, "ficos", "espec\u00EDficos");
add("pol", F, "gono", "pol\u00EDgono");
add("di", F, "metro", "di\u00E2metro");
add("Di", F, "metro", "Di\u00E2metro");
add("par", F, "metro", "par\u00E2metro");
add("Par", F, "metro", "Par\u00E2metro");
add("par", F, "metros", "par\u00E2metros");
add("n", F, "vel", "n\u00EDvel");
add("N", F, "vel", "N\u00EDvel");
add("n", F, "veis", "n\u00EDveis");
add("poss", F, "vel", "poss\u00EDvel");
add("Poss", F, "vel", "Poss\u00EDvel");
add("poss", F, "veis", "poss\u00EDveis");
add("incompat", F, "vel", "incompat\u00EDvel");
add("compat", F, "vel", "compat\u00EDvel");
add("obrigat", F, "rio", "obrigat\u00F3rio");
add("obrigat", F, "ria", "obrigat\u00F3ria");
add("opcion", F, "rio", "opcion\u00E1l"); // WRONG - should be opcional
// fix:
PAIRS.pop();
add("opcion", F, "rio", "opcional");
add("opcion", F, "l", "opcional");
add("adicion", F, "rio", "adicion\u00E1rio");
add("adicion", F, "is", "adicionais");
add("materi", F, "is", "materiais");
add("industri", F, "is", "industriais");
add("especi", F, "is", "especiais");
add("horizont", F, "is", "horizontais");
add("vertic", F, "is", "verticais");
add("later", F, "is", "laterais");
add("Later", F, "is", "Laterais");
add("princip", F, "is", "principais");
add("fin", F, "is", "finais");
add("tot", F, "is", "totais");
add("parci", F, "is", "parciais");
add("inici", F, "is", "iniciais");
add("ofici", F, "is", "oficiais");
add("re", F, "is", "reais");
add("ide", F, "is", "ideais");

// em-dash leftovers / pairing quotes
add(" ", F, " ", " \u2014 ");
add("h\u2014 drill", "h\u00E1 drill");
add("n\u00E3o h\u2014", "n\u00E3o h\u00E1");
add("?", F, "", "\u2026");

function skip(rel) {
  const n = rel.replace(/\\/g, "/");
  if (n.includes("/cnc/") || n.includes("cnc-examples")) return true;
  if (/\.(xml|tcn|anc)$/i.test(n)) return true;
  if (n.includes("fix-pt-encoding") || n.includes("fix-hub-encoding")) return true;
  if (n.includes("auditPortuguese") || n.includes("audit-hub") || n.includes("repair-hub")) return true;
  if (n === "build-output.txt" || n === "publish-output.txt") return true;
  if (n.startsWith("tmp-") || n.includes("/tmp-")) return true;
  return false;
}

function walk(dir, out = []) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (SKIP_DIR.has(e.name) || (e.name.startsWith("tmp-") && e.isDirectory())) continue;
    const full = path.join(dir, e.name);
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    if (skip(rel)) continue;
    if (e.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(e.name).toLowerCase())) out.push(full);
  }
  return out;
}

const sorted = [...PAIRS].sort((a, b) => b[0].length - a[0].length);
const files = walk(ROOT);
const changed = [];
let before = 0;
let after = 0;

for (const file of files) {
  let buf = fs.readFileSync(file);
  if (buf.includes(0)) continue;
  const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  let text = hasBom ? buf.slice(3).toString("utf8") : buf.toString("utf8");
  const n0 = (text.match(/\uFFFD/g) || []).length;
  if (n0 === 0 && !hasBom) continue;
  before += n0;
  let next = text;
  for (const [from, to] of sorted) {
    if (next.includes(from)) next = next.split(from).join(to);
  }
  const n1 = (next.match(/\uFFFD/g) || []).length;
  after += n1;
  if (next !== text || hasBom) {
    fs.writeFileSync(file, next, { encoding: "utf8" });
    changed.push({ file: path.relative(ROOT, file).replace(/\\/g, "/"), before: n0, after: n1 });
  }
}

changed.sort((a, b) => b.before - a.before);
console.log(JSON.stringify({ filesChanged: changed.length, fffdBefore: before, fffdAfter: after, top: changed.slice(0, 30) }, null, 2));
