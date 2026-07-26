/**
 * fix-pt-encoding.mjs — correção segura de U+FFFD / mojibake.
 * FROM/TO apenas com escapes \\u — o próprio ficheiro não contém acentos literais.
 * Não processa src/industrial/** nem este script.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const F = "\uFFFD";

const SKIP_DIR = new Set(["node_modules", "dist", ".git", "coverage", "tmp", "ANTUNIS", "backend", "data"]);
const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".html", ".css", ".txt"]);

/** @type {Array<[string, string]>} */
const PAIRS = [];

function add(fromParts, to) {
  PAIRS.push([fromParts.join(""), to]);
}

// --- cão / ção (2x FFFD) ---
for (const [stem, fixed] of [
  ["documenta", "documenta\u00E7\u00E3o"],
  ["Documenta", "Documenta\u00E7\u00E3o"],
  ["informa", "informa\u00E7\u00E3o"],
  ["Informa", "Informa\u00E7\u00E3o"],
  ["configura", "configura\u00E7\u00E3o"],
  ["Configura", "Configura\u00E7\u00E3o"],
  ["gera", "gera\u00E7\u00E3o"],
  ["Gera", "Gera\u00E7\u00E3o"],
  ["fura", "fura\u00E7\u00E3o"],
  ["Fura", "Fura\u00E7\u00E3o"],
  ["valida", "valida\u00E7\u00E3o"],
  ["Valida", "Valida\u00E7\u00E3o"],
  ["verifica", "verifica\u00E7\u00E3o"],
  ["Verifica", "Verifica\u00E7\u00E3o"],
  ["publica", "publica\u00E7\u00E3o"],
  ["Publica", "Publica\u00E7\u00E3o"],
  ["migra", "migra\u00E7\u00E3o"],
  ["Migra", "Migra\u00E7\u00E3o"],
  ["descri", "descri\u00E7\u00E3o"],
  ["fun", "fun\u00E7\u00E3o"],
  ["Fun", "Fun\u00E7\u00E3o"],
  ["op", "op\u00E7\u00E3o"],
  ["posi", "posi\u00E7\u00E3o"],
  ["constru", "constru\u00E7\u00E3o"],
  ["edi", "edi\u00E7\u00E3o"],
  ["Edi", "Edi\u00E7\u00E3o"],
  ["extens", "extens\u00E3o"],
  ["vers", "vers\u00E3o"],
  ["omiss", "omiss\u00E3o"],
  ["sec", "sec\u00E7\u00E3o"],
  ["Sec", "Sec\u00E7\u00E3o"],
  ["sanitiza", "sanitiza\u00E7\u00E3o"],
  ["serializa", "serializa\u00E7\u00E3o"],
  ["visualiza", "visualiza\u00E7\u00E3o"],
]) {
  add([stem, F, F, "o"], fixed);
  add([stem, F, "o"], fixed); // partial
}

for (const [stem, fixed] of [
  ["altera", "altera\u00E7\u00F5es"],
  ["Altera", "Altera\u00E7\u00F5es"],
  ["observa", "observa\u00E7\u00F5es"],
  ["Observa", "Observa\u00E7\u00F5es"],
  ["opera", "opera\u00E7\u00F5es"],
  ["Opera", "Opera\u00E7\u00F5es"],
  ["corre", "corre\u00E7\u00F5es"],
  ["Corre", "Corre\u00E7\u00F5es"],
  ["fun", "fun\u00E7\u00F5es"],
  ["op", "op\u00E7\u00F5es"],
  ["sec", "sec\u00E7\u00F5es"],
  ["valida", "valida\u00E7\u00F5es"],
  ["Valida", "Valida\u00E7\u00F5es"],
  ["dimens", "dimens\u00F5es"],
  ["Dimens", "Dimens\u00F5es"],
]) {
  add([stem, F, F, "es"], fixed);
  add([stem, F, "es"], fixed);
}

add(["Pr", F, "-visualiza", F, F, "o"], "Pr\u00E9-visualiza\u00E7\u00E3o");
add(["pr", F, "-visualiza", F, F, "o"], "pr\u00E9-visualiza\u00E7\u00E3o");
add(["Pr", F, "-visualiza", F, "o"], "Pr\u00E9-visualiza\u00E7\u00E3o");
add(["pr", F, "-visualiza", F, "o"], "pr\u00E9-visualiza\u00E7\u00E3o");

// palavras comuns
const WORDS = [
  ["Gaveta v", F, "lida", "Gaveta v\u00E1lida"],
  ["Gaveta inv", F, "lida", "Gaveta inv\u00E1lida"],
  ["v", F, "lida", "v\u00E1lida"],
  ["V", F, "lida", "V\u00E1lida"],
  ["v", F, "lido", "v\u00E1lido"],
  ["V", F, "lido", "V\u00E1lido"],
  ["v", F, "lidos", "v\u00E1lidos"],
  ["V", F, "lidos", "V\u00E1lidos"],
  ["inv", F, "lida", "inv\u00E1lida"],
  ["Inv", F, "lida", "Inv\u00E1lida"],
  ["inv", F, "lido", "inv\u00E1lido"],
  ["inv", F, "lidos", "inv\u00E1lidos"],
  ["Inv", F, "lidos", "Inv\u00E1lidos"],
  ["Corredi", F, "a", "Corredi\u00E7a"],
  ["corredi", F, "a", "corredi\u00E7a"],
  ["Corredi", F, "as", "Corredi\u00E7as"],
  ["corredi", F, "as", "corredi\u00E7as"],
  ["Vis", F, "vel", "Vis\u00EDvel"],
  ["vis", F, "vel", "vis\u00EDvel"],
  ["Hist", F, "rico", "Hist\u00F3rico"],
  ["hist", F, "rico", "hist\u00F3rico"],
  ["Respons", F, "vel", "Respons\u00E1vel"],
  ["respons", F, "vel", "respons\u00E1vel"],
  ["T", F, "tulo", "T\u00EDtulo"],
  ["t", F, "tulo", "t\u00EDtulo"],
  ["cat", F, "logo", "cat\u00E1logo"],
  ["Cat", F, "logo", "Cat\u00E1logo"],
  ["t", F, "cnica", "t\u00E9cnica"],
  ["T", F, "cnica", "T\u00E9cnica"],
  ["t", F, "cnico", "t\u00E9cnico"],
  ["T", F, "cnico", "T\u00E9cnico"],
  ["t", F, "cnicas", "t\u00E9cnicas"],
  ["p", F, "ginas", "p\u00E1ginas"],
  ["P", F, "ginas", "P\u00E1ginas"],
  ["p", F, "gina", "p\u00E1gina"],
  ["p", F, "gs", "p\u00E1gs"],
  ["mem", F, "ria", "mem\u00F3ria"],
  ["Mem", F, "ria", "Mem\u00F3ria"],
  ["pe", F, "a", "pe\u00E7a"],
  ["Pe", F, "a", "Pe\u00E7a"],
  ["pe", F, "as", "pe\u00E7as"],
  ["Pe", F, "as", "Pe\u00E7as"],
  ["c", F, "digo", "c\u00F3digo"],
  ["C", F, "digo", "C\u00F3digo"],
  ["c", F, "digos", "c\u00F3digos"],
  ["n", F, "cleo", "n\u00FAcleo"],
  ["m", F, "dulo", "m\u00F3dulo"],
  ["M", F, "dulo", "M\u00F3dulo"],
  ["m", F, "dulos", "m\u00F3dulos"],
  ["m", F, "nimo", "m\u00EDnimo"],
  ["m", F, "ximo", "m\u00E1ximo"],
  ["m", F, "xima", "m\u00E1xima"],
  ["f", F, "sico", "f\u00EDsico"],
  ["f", F, "sicos", "f\u00EDsicos"],
  ["f", F, "sicas", "f\u00EDsicas"],
  ["autom", F, "ticos", "autom\u00E1ticos"],
  ["autom", F, "tico", "autom\u00E1tico"],
  ["autom", F, "tica", "autom\u00E1tica"],
  ["refer", F, "ncia", "refer\u00EAncia"],
  ["Refer", F, "ncia", "Refer\u00EAncia"],
  ["refer", F, "ncias", "refer\u00EAncias"],
  ["l", F, "gica", "l\u00F3gica"],
  ["l", F, "gicas", "l\u00F3gicas"],
  ["l", F, "gico", "l\u00F3gico"],
  ["gr", F, "fico", "gr\u00E1fico"],
  ["gr", F, "ficos", "gr\u00E1ficos"],
  ["conte", F, "do", "conte\u00FAdo"],
  ["conte", F, "dos", "conte\u00FAdos"],
  ["dom", F, "nio", "dom\u00EDnio"],
  ["usu", F, "rio", "usu\u00E1rio"],
  ["unit", F, "rias", "unit\u00E1rias"],
  ["unit", F, "rios", "unit\u00E1rios"],
  ["expl", F, "cito", "expl\u00EDcito"],
  ["expl", F, "cita", "expl\u00EDcita"],
  ["sem", F, "ntico", "sem\u00E2ntico"],
  ["dispon", F, "vel", "dispon\u00EDvel"],
  ["dispon", F, "veis", "dispon\u00EDveis"],
  ["reutiliz", F, "veis", "reutiliz\u00E1veis"],
  ["reutiliz", F, "vel", "reutiliz\u00E1vel"],
  ["ergon", F, "micas", "ergon\u00F3micas"],
  ["ergon", F, "mica", "ergon\u00F3mica"],
  ["colis", F, "es", "colis\u00F5es"],
  ["simult", F, "neo", "simult\u00E2neo"],
  ["conclu", F, "do", "conclu\u00EDdo"],
  ["Constr", F, "i", "Constr\u00F3i"],
  ["constr", F, "i", "constr\u00F3i"],
  ["sobrep", F, "e", "sobrep\u00F5e"],
  ["sequ", F, "ncia", "sequ\u00EAncia"],
  ["Sequ", F, "ncia", "Sequ\u00EAncia"],
  ["n", F, "o", "n\u00E3o"],
  ["N", F, "o", "N\u00E3o"],
  ["N", F, "O", "N\u00C3O"],
  ["j", F, "", "j\u00E1"],
  ["J", F, "", "J\u00E1"],
  ["s", F, "", "s\u00F3"],
  ["S", F, "", "S\u00F3"],
  ["at", F, "", "at\u00E9"],
  ["est", F, "", "est\u00E1"],
  ["Est", F, "", "Est\u00E1"],
  ["est", F, "o", "est\u00E3o"],
  ["tamb", F, "m", "tamb\u00E9m"],
  ["al", F, "m", "al\u00E9m"],
  ["atrav", F, "s", "atrav\u00E9s"],
  ["ap", F, "s", "ap\u00F3s"],
  ["Ap", F, "s", "Ap\u00F3s"],
  ["atr", F, "s", "atr\u00E1s"],
  ["pr", F, "ximo", "pr\u00F3ximo"],
  ["pr", F, "pria", "pr\u00F3pria"],
  ["pr", F, "prio", "pr\u00F3prio"],
  ["mant", F, "m", "mant\u00E9m"],
  ["cont", F, "m", "cont\u00E9m"],
  ["ser", F, "", "ser\u00E1"],
  ["pre", F, "o", "pre\u00E7o"],
  ["Pre", F, "o", "Pre\u00E7o"],
  ["m", F, "o de obra", "m\u00E3o de obra"],
  ["roda-p", F, "", "roda-p\u00E9"],
  ["Roda-p", F, "", "Roda-p\u00E9"],
  ["mudan", F, "a", "mudan\u00E7a"],
  ["consist", F, "ncia", "consist\u00EAncia"],
  ["n", F, "mero", "n\u00FAmero"],
  ["N", F, "mero", "N\u00FAmero"],
  ["N", F, " gavetas", "N\u00BA gavetas"],
  ["N", F, " furos", "N\u00BA furos"],
  ["A gerar", F, "", "A gerar\u2026"],
  ["A executar", F, "", "A executar\u2026"],
  ["pr", F, "-", "pr\u00E9-"],
  ["Pr", F, "-", "Pr\u00E9-"],
  ["p", F, "s-", "p\u00F3s-"],
  ["P", F, "s-", "P\u00F3s-"],
];

for (const row of WORDS) {
  const to = row[row.length - 1];
  const fromParts = row.slice(0, -1);
  add(fromParts, to);
}

// prefixes úteis / único / área (só se FFFD no início de palavra — cuidado)
add([F, "til"], "\u00FAtil");
add([F, "teis"], "\u00FAteis");
add([F, "nica"], "\u00FAnica");
add([F, "nico"], "\u00FAnico");
add([F, "rea"], "\u00E1rea");
add([F, "ndice"], "\u00EDndice");
add([F, "ngulo"], "\u00E2ngulo");
add([F, "ltimo"], "\u00FAltimo");
add([F, "ltima"], "\u00FAltima");

// separador tipográfico
add([" ", F, " "], " \u2014 ");

const MOJIBAKE = [
  ["\u00C3\u00A1", "\u00E1"],
  ["\u00C3\u00A3", "\u00E3"],
  ["\u00C3\u00A2", "\u00E2"],
  ["\u00C3\u00A9", "\u00E9"],
  ["\u00C3\u00AA", "\u00EA"],
  ["\u00C3\u00AD", "\u00ED"],
  ["\u00C3\u00B3", "\u00F3"],
  ["\u00C3\u00B4", "\u00F4"],
  ["\u00C3\u00B5", "\u00F5"],
  ["\u00C3\u00BA", "\u00FA"],
  ["\u00C3\u00A7", "\u00E7"],
  ["\u00C2\u00BA", "\u00BA"],
  ["\u00C2\u00AA", "\u00AA"],
  ["\u00E2\u20AC\u201D", "\u2014"],
  ["\u00E2\u20AC\u201C", "\u2013"],
  ["\u00E2\u20AC\u00A6", "\u2026"],
];

function skip(rel) {
  const n = rel.replace(/\\/g, "/");
  if (n.includes("src/industrial/")) return true;
  if (n.includes("fix-pt-encoding")) return true;
  if (n.includes("fix-portuguese-encoding")) return true;
  return false;
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    const rel = path.relative(ROOT, full);
    if (skip(rel)) continue;
    if (ent.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

function fixText(text) {
  let next = text;
  const sorted = [...PAIRS].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of sorted) {
    if (from.length === 0 || from === to) continue;
    // nunca substituir FFFD isolado
    if (from === F) continue;
    if (next.includes(from)) next = next.split(from).join(to);
  }
  for (const [from, to] of MOJIBAKE) {
    if (next.includes(from)) next = next.split(from).join(to);
  }
  return next;
}

const roots = ["src", "public/updates", "tests"].filter((r) => fs.existsSync(path.join(ROOT, r)));
const files = roots.flatMap((r) => walk(path.join(ROOT, r)));
const changed = [];

for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  if (!before.includes(F) && !before.includes("\u00C3") && !before.includes("\u00E2\u20AC")) continue;
  const after = fixText(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changed.push(path.relative(ROOT, file).replace(/\\/g, "/"));
  }
}

let remain = 0;
const remainSamples = [];
for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel.includes("src/industrial/")) continue;
  const n = (fs.readFileSync(file, "utf8").match(/\uFFFD/g) || []).length;
  remain += n;
  if (n && remainSamples.length < 25) remainSamples.push(`${rel}:${n}`);
}

console.log("FIXED=" + changed.length);
changed.filter((f) => f.includes("drawer") || f.includes("Drawer") || f.includes("gaveta") || f.includes("admin")).forEach((f) => console.log(" " + f));
console.log("REMAIN_FFFD=" + remain);
remainSamples.forEach((s) => console.log(" " + s));
