#!/usr/bin/env node
/** Residual pass 2 ù vocabulario dos relatorios/docs (escapes \\u only). */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const F = "\uFFFD";
const SKIP_DIR = new Set(["node_modules", "dist", "build", ".git", "coverage", "tmp", "data", "ANTUNIS", "cnc"]);
const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".html", ".css", ".txt"]);

/** @type {Array<[string, string]>} */
const P = [];
const a = (fromParts, to) => {
  const from = fromParts.join("");
  if (from && from !== to && from !== F) P.push([from, to]);
};

const W = [
  ["substitu", F, "do", "substitu\u00EDdo"],
  ["Substitu", F, "do", "Substitu\u00EDdo"],
  ["M", F, "dio", "M\u00E9dio"],
  ["m", F, "dio", "m\u00E9dio"],
  ["Mudan", F, "a", "Mudan\u00E7a"],
  ["mudan", F, "a", "mudan\u00E7a"],
  ["Raz", F, "o", "Raz\u00E3o"],
  ["raz", F, "o", "raz\u00E3o"],
  ["RENDERIZA", F, F, "O", "RENDERIZA\u00C7\u00C3O"],
  ["DIFEREN", F, "AS", "DIFEREN\u00C7AS"],
  ["COMPARA", F, F, "O", "COMPARA\u00C7\u00C3O"],
  ["ALTERA", F, F, "ES", "ALTERA\u00C7\u00D5ES"],
  ["t", F, "m", "t\u00EAm"],
  ["T", F, "m", "T\u00EAm"],
  ["A", F, "es", "A\u00E7\u00F5es"],
  ["13 a", F, "es", "13 a\u00E7\u00F5es"],
  ["novas a", F, "es", "novas a\u00E7\u00F5es"],
  ["A", F, "o", "A\u00E7\u00E3o"],
  ["strong>A", F, "o:", "strong>A\u00E7\u00E3o:"],
  ["strong>A", F, "o<", "strong>A\u00E7\u00E3o<"],
  ["Valida", F, "es", "Valida\u00E7\u00F5es"],
  ["valida", F, "es", "valida\u00E7\u00F5es"],
  ["Recomenda", F, "o", "Recomenda\u00E7\u00E3o"],
  ["recomenda", F, "o", "recomenda\u00E7\u00E3o"],
  ["Defini", F, "o", "Defini\u00E7\u00E3o"],
  ["defini", F, "o", "defini\u00E7\u00E3o"],
  ["Regenera", F, "o", "Regenera\u00E7\u00E3o"],
  ["regenera", F, "o", "regenera\u00E7\u00E3o"],
  ["C", F, "lculo", "C\u00E1lculo"],
  ["c", F, "lculo", "c\u00E1lculo"],
  ["rastre", F, "veis", "rastre\u00E1veis"],
  ["f", F, "brica", "f\u00E1brica"],
  ["F", F, "brica", "F\u00E1brica"],
  ["bot", F, "o", "bot\u00E3o"],
  ["Bot", F, "o", "Bot\u00E3o"],
  ["dire", F, "o", "dire\u00E7\u00E3o"],
  ["Dire", F, "o", "Dire\u00E7\u00E3o"],
  ["L", F, "gica", "L\u00F3gica"],
  ["l", F, "gica", "l\u00F3gica"],
  ["piv", F, "s", "piv\u00F4s"],
  ["anima", F, "es", "anima\u00E7\u00F5es"],
  ["efici", F, "ncia", "efici\u00EAncia"],
  ["Solu", F, "o", "Solu\u00E7\u00E3o"],
  ["solu", F, "o", "solu\u00E7\u00E3o"],
  ["Mitiga", F, "o", "Mitiga\u00E7\u00E3o"],
  ["mitiga", F, "o", "mitiga\u00E7\u00E3o"],
  ["Configur", F, "vel", "Configur\u00E1vel"],
  ["configur", F, "vel", "configur\u00E1vel"],
  ["configur", F, "veis", "configur\u00E1veis"],
  ["Depend", F, "ncia", "Depend\u00EAncia"],
  ["depend", F, "ncia", "depend\u00EAncia"],
  ["m", F, "ltiplas", "m\u00FAltiplas"],
  ["m", F, "ltiplos", "m\u00FAltiplos"],
  ["Importa", F, "o", "Importa\u00E7\u00E3o"],
  ["importa", F, "o", "importa\u00E7\u00E3o"],
  ["Compila", F, "o", "Compila\u00E7\u00E3o"],
  ["compila", F, "o", "compila\u00E7\u00E3o"],
  ["fura", F, "o", "fura\u00E7\u00E3o"],
  ["Fura", F, "o", "Fura\u00E7\u00E3o"],
  ["avan", F, "ada", "avan\u00E7ada"],
  ["Avan", F, "ada", "Avan\u00E7ada"],
  ["t\u00E9c\u00FAnica", "t\u00E9cnica"],
  ["t\u00E9c\u00FAnicos", "t\u00E9cnicos"],
  ["correc", F, "\u00E3o", "corre\u00E7\u00E3o"],
  ["propor", F, "\u00F5es", "propor\u00E7\u00F5es"],
  ["PROTEC\u00E9", F, "O", "PROTEC\u00C7\u00C3O"],
  ["n\u00E3o h\u2014", "n\u00E3o h\u00E1"],
  ["h\u2014 drill", "h\u00E1 drill"],
  ["servi", F, "o", "servi\u00E7o"],
  ["Persist", F, "ncia", "Persist\u00EAncia"],
  ["Resolu", F, "o", "Resolu\u00E7\u00E3o"],
  ["resolu", F, "o", "resolu\u00E7\u00E3o"],
  ["Descri", F, "o", "Descri\u00E7\u00E3o"],
  ["descri", F, "o", "descri\u00E7\u00E3o"],
  ["Op", F, "o", "Op\u00E7\u00E3o"],
  ["op", F, "o", "op\u00E7\u00E3o"],
  ["sec", F, "o", "sec\u00E7\u00E3o"],
  ["Sec", F, "o", "Sec\u00E7\u00E3o"],
  ["posi", F, "o", "posi\u00E7\u00E3o"],
  ["Posi", F, "o", "Posi\u00E7\u00E3o"],
  ["fun", F, "o", "fun\u00E7\u00E3o"],
  ["Fun", F, "o", "Fun\u00E7\u00E3o"],
  ["aten", F, "o", "aten\u00E7\u00E3o"],
  ["Aten", F, "o", "Aten\u00E7\u00E3o"],
  ["informa", F, "o", "informa\u00E7\u00E3o"],
  ["Informa", F, "o", "Informa\u00E7\u00E3o"],
  ["configura", F, "o", "configura\u00E7\u00E3o"],
  ["Configura", F, "o", "Configura\u00E7\u00E3o"],
  ["exporta", F, "o", "exporta\u00E7\u00E3o"],
  ["Exporta", F, "o", "Exporta\u00E7\u00E3o"],
  ["integra", F, "o", "integra\u00E7\u00E3o"],
  ["Integra", F, "o", "Integra\u00E7\u00E3o"],
  ["opera", F, "o", "opera\u00E7\u00E3o"],
  ["Opera", F, "o", "Opera\u00E7\u00E3o"],
  ["visualiza", F, "o", "visualiza\u00E7\u00E3o"],
  ["Visualiza", F, "o", "Visualiza\u00E7\u00E3o"],
  ["documenta", F, "o", "documenta\u00E7\u00E3o"],
  ["Documenta", F, "o", "Documenta\u00E7\u00E3o"],
  ["valida", F, "o", "valida\u00E7\u00E3o"],
  ["Valida", F, "o", "Valida\u00E7\u00E3o"],
  ["verifica", F, "o", "verifica\u00E7\u00E3o"],
  ["publica", F, "o", "publica\u00E7\u00E3o"],
  ["Publica", F, "o", "Publica\u00E7\u00E3o"],
  ["normaliza", F, "o", "normaliza\u00E7\u00E3o"],
  ["execu", F, "o", "execu\u00E7\u00E3o"],
  ["Execu", F, "o", "Execu\u00E7\u00E3o"],
  ["sele", F, "o", "sele\u00E7\u00E3o"],
  ["produ", F, "o", "produ\u00E7\u00E3o"],
  ["constru", F, "o", "constru\u00E7\u00E3o"],
  ["Constru", F, "o", "Constru\u00E7\u00E3o"],
  ["reconstru", F, "o", "reconstru\u00E7\u00E3o"],
  ["Reconstru", F, "o", "Reconstru\u00E7\u00E3o"],
  ["corre", F, "o", "corre\u00E7\u00E3o"],
  ["Corre", F, "o", "Corre\u00E7\u00E3o"],
  ["prote", F, "o", "prote\u00E7\u00E3o"],
  ["Prote", F, "o", "Prote\u00E7\u00E3o"],
  ["esta", F, "o", "esta\u00E7\u00E3o"],
  ["Esta", F, "o", "Esta\u00E7\u00E3o"],
  ["informa", F, "es", "informa\u00E7\u00F5es"],
  ["Informa", F, "es", "Informa\u00E7\u00F5es"],
  ["configura", F, "es", "configura\u00E7\u00F5es"],
  ["opera", F, "es", "opera\u00E7\u00F5es"],
  ["Opera", F, "es", "Opera\u00E7\u00F5es"],
  ["dimens", F, "es", "dimens\u00F5es"],
  ["Dimens", F, "es", "Dimens\u00F5es"],
  ["sec", F, "es", "sec\u00E7\u00F5es"],
  ["fun", F, "es", "fun\u00E7\u00F5es"],
  ["op", F, "es", "op\u00E7\u00F5es"],
  ["Observa", F, "es", "Observa\u00E7\u00F5es"],
  ["observa", F, "es", "observa\u00E7\u00F5es"],
  [" ", F, " ", " \u2014 "],
  [">", F, "<", ">\u2014<"],
  ["<td>", F, "</td>", "<td>\u2014</td>"],
];

for (const row of W) a(row.slice(0, -1), row[row.length - 1]);

function skip(rel) {
  const n = rel.replace(/\\/g, "/");
  return (
    n.includes("fix-pt-encoding") ||
    n.includes("fix-hub-encoding") ||
    n.includes("auditPortuguese") ||
    n.includes("audit-hub") ||
    n.includes("repair-hub") ||
    n === "build-output.txt" ||
    n === "publish-output.txt" ||
    n.startsWith("tmp-") ||
    n.includes("/cnc/") ||
    /\.(xml|tcn|anc)$/i.test(n)
  );
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(e.name) || (e.name.startsWith("tmp-") && e.isDirectory())) continue;
    const full = path.join(dir, e.name);
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    if (skip(rel)) continue;
    if (e.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(e.name).toLowerCase())) out.push(full);
  }
  return out;
}

const sorted = [...P].sort((x, y) => y[0].length - x[0].length);
let before = 0;
let after = 0;
const changed = [];
for (const file of walk(ROOT)) {
  let buf = fs.readFileSync(file);
  if (buf.includes(0)) continue;
  const bom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  let t = bom ? buf.slice(3).toString("utf8") : buf.toString("utf8");
  const n0 = (t.match(/\uFFFD/g) || []).length;
  if (!n0 && !bom) continue;
  before += n0;
  let next = t;
  for (const [from, to] of sorted) if (next.includes(from)) next = next.split(from).join(to);
  const n1 = (next.match(/\uFFFD/g) || []).length;
  after += n1;
  if (next !== t || bom) {
    fs.writeFileSync(file, next, { encoding: "utf8" });
    changed.push({ file: path.relative(ROOT, file).replace(/\\/g, "/"), before: n0, after: n1 });
  }
}
changed.sort((a, b) => b.before - a.before);
console.log(JSON.stringify({ filesChanged: changed.length, fffdBefore: before, fffdAfter: after, top: changed.slice(0, 25) }, null, 2));
