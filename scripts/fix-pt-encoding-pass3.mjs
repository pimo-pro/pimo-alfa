/**
 * Pass 3: remaining Portuguese FFFD / accent repairs (UTF-8 escapes only).
 * Does NOT touch src/industrial/**.
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

// --- ��o / ��es (2x and 1x FFFD) ---
for (const [stem, fixed] of [
  ["exporta", "exporta\u00E7\u00E3o"],
  ["Exporta", "Exporta\u00E7\u00E3o"],
  ["implementa", "implementa\u00E7\u00E3o"],
  ["Implementa", "Implementa\u00E7\u00E3o"],
  ["integra", "integra\u00E7\u00E3o"],
  ["Integra", "Integra\u00E7\u00E3o"],
  ["opera", "opera\u00E7\u00E3o"],
  ["Opera", "Opera\u00E7\u00E3o"],
  ["constru", "constru\u00E7\u00E3o"],
  ["Constru", "Constru\u00E7\u00E3o"],
  ["corre", "corre\u00E7\u00E3o"],
  ["Corre", "Corre\u00E7\u00E3o"],
  ["serializa", "serializa\u00E7\u00E3o"],
  ["Serializa", "Serializa\u00E7\u00E3o"],
  ["posi", "posi\u00E7\u00E3o"],
  ["Posi", "Posi\u00E7\u00E3o"],
  ["memoiza", "memoiza\u00E7\u00E3o"],
  ["Memoiza", "Memoiza\u00E7\u00E3o"],
  ["simula", "simula\u00E7\u00E3o"],
  ["Simula", "Simula\u00E7\u00E3o"],
  ["prote", "prote\u00E7\u00E3o"],
  ["Prote", "Prote\u00E7\u00E3o"],
  ["muta", "muta\u00E7\u00E3o"],
  ["normaliza", "normaliza\u00E7\u00E3o"],
  ["Normaliza", "Normaliza\u00E7\u00E3o"],
  ["identifica", "identifica\u00E7\u00E3o"],
  ["Identifica", "Identifica\u00E7\u00E3o"],
  ["otimiza", "otimiza\u00E7\u00E3o"],
  ["execu", "execu\u00E7\u00E3o"],
  ["combina", "combina\u00E7\u00E3o"],
  ["formata", "formata\u00E7\u00E3o"],
  ["Formata", "Formata\u00E7\u00E3o"],
  ["altera", "altera\u00E7\u00E3o"],
  ["rota", "rota\u00E7\u00E3o"],
  ["Rota", "Rota\u00E7\u00E3o"],
  ["interse", "interse\u00E7\u00E3o"],
  ["Interse", "Interse\u00E7\u00E3o"],
  ["sele", "sele\u00E7\u00E3o"],
  ["orquestra", "orquestra\u00E7\u00E3o"],
  ["orienta", "orienta\u00E7\u00E3o"],
  ["fixa", "fixa\u00E7\u00E3o"],
  ["Fixa", "Fixa\u00E7\u00E3o"],
  ["renderiza", "renderiza\u00E7\u00E3o"],
  ["monetiza", "monetiza\u00E7\u00E3o"],
  ["classifica", "classifica\u00E7\u00E3o"],
  ["reconcilia", "reconcilia\u00E7\u00E3o"],
  ["coloca", "coloca\u00E7\u00E3o"],
  ["Coloca", "Coloca\u00E7\u00E3o"],
  ["eleva", "eleva\u00E7\u00E3o"],
  ["Eleva", "Eleva\u00E7\u00E3o"],
  ["ocupa", "ocupa\u00E7\u00E3o"],
  ["manuten", "manuten\u00E7\u00E3o"],
  ["consolida", "consolida\u00E7\u00E3o"],
  ["Consolida", "Consolida\u00E7\u00E3o"],
  ["apresenta", "apresenta\u00E7\u00E3o"],
  ["unifica", "unifica\u00E7\u00E3o"],
  ["produ", "produ\u00E7\u00E3o"],
  ["fra", "fra\u00E7\u00E3o"],
  ["Fra", "Fra\u00E7\u00E3o"],
  ["a", "a\u00E7\u00E3o"],
  ["descri", "descri\u00E7\u00E3o"],
  ["Descri", "Descri\u00E7\u00E3o"],
]) {
  add([stem, F, F, "o"], fixed);
  add([stem, F, "o"], fixed);
}

for (const [stem, fixed] of [
  ["varia", "varia\u00E7\u00F5es"],
  ["exporta", "exporta\u00E7\u00F5es"],
  ["Exporta", "Exporta\u00E7\u00F5es"],
  ["integra", "integra\u00E7\u00F5es"],
  ["Integra", "Integra\u00E7\u00F5es"],
  ["rela", "rela\u00E7\u00F5es"],
  ["posi", "posi\u00E7\u00F5es"],
  ["descri", "descri\u00E7\u00F5es"],
  ["Descri", "Descri\u00E7\u00F5es"],
  ["a", "a\u00E7\u00F5es"],
]) {
  add([stem, F, F, "es"], fixed);
  add([stem, F, "es"], fixed);
}

// partial / broken forms
add(["Posi", F, "o"], "Posi\u00E7\u00E3o");
add(["Inser", F, F, "o"], "Inser\u00E7\u00E3o");
add(["Inser\u00E7", F, "o"], "Inser\u00E7\u00E3o");

const WORDS = [
  ["Or", F, "amentos", "Or\u00E7amentos"],
  ["or", F, "amentos", "or\u00E7amentos"],
  ["avan", F, "adas", "avan\u00E7adas"],
  ["avan", F, "ados", "avan\u00E7ados"],
  ["avan", F, "ado", "avan\u00E7ado"],
  ["Avan", F, "ado", "Avan\u00E7ado"],
  ["padr", F, "o", "padr\u00E3o"],
  ["cen", F, "rios", "cen\u00E1rios"],
  ["cen", F, "rio", "cen\u00E1rio"],
  ["Cen", F, "rio", "Cen\u00E1rio"],
  ["rodap", F, "", "rodap\u00E9"],
  ["Rodap", F, "", "Rodap\u00E9"],
  ["desperd", F, "cio", "desperd\u00EDcio"],
  ["Desperd", F, "cio", "desperd\u00EDcio"],
  ["pain", F, "is", "pain\u00E9is"],
  ["Pain", F, "is", "Pain\u00E9is"],
  ["Conte", F, "dos", "Conte\u00FAdos"],
  ["Conte", F, "do", "Conte\u00FAdo"],
  ["conte", F, "do", "conte\u00FAdo"],
  ["f", F, "sica", "f\u00EDsica"],
  ["f", F, "sico", "f\u00EDsico"],
  ["Consist", F, "ncia", "Consist\u00EAncia"],
  ["consist", F, "ncia", "consist\u00EAncia"],
  ["Dist", F, "ncia", "Dist\u00E2ncia"],
  ["dist", F, "ncia", "dist\u00E2ncia"],
  ["f", F, "rmula", "f\u00F3rmula"],
  ["f", F, "rmulas", "f\u00F3rmulas"],
  ["neg", F, "cio", "neg\u00F3cio"],
  ["for", F, "ar", "for\u00E7ar"],
  ["for", F, "adas", "for\u00E7adas"],
  ["di", F, "metro", "di\u00E2metro"],
  ["log", F, "stica", "log\u00EDstica"],
  ["Log", F, "stica", "Log\u00EDstica"],
  ["per", F, "metro", "per\u00EDmetro"],
  ["Per", F, "metro", "Per\u00EDmetro"],
  ["serializ", F, "vel", "serializ\u00E1vel"],
  ["serializ", F, "veis", "serializ\u00E1veis"],
  ["determin", F, "sticos", "determin\u00EDsticos"],
  ["determin", F, "stico", "determin\u00EDstico"],
  ["leg", F, "vel", "leg\u00EDvel"],
  ["catastr", F, "fica", "catastr\u00F3fica"],
  ["id", F, "ntica", "id\u00EAntica"],
  ["id", F, "ntico", "id\u00EAntico"],
  ["espa", F, "o", "espa\u00E7o"],
  ["heur", F, "sticos", "heur\u00EDsticos"],
  ["heur", F, "stica", "heur\u00EDstica"],
  ["M", F, "o", "M\u00E3o"],
  ["m", F, "o", "m\u00E3o"],
  ["pe", F, "", "pe\u00E7a"],
  ["cal", F, "o", "cal\u00E7o"],
  ["n", F, "vel", "n\u00EDvel"],
  ["presen", F, "a", "presen\u00E7a"],
  ["din", F, "mica", "din\u00E2mica"],
  ["din", F, "mico", "din\u00E2mico"],
  ["din", F, "micos", "din\u00E2micos"],
  ["al", F, "ado", "al\u00E7ado"],
  ["f", F, "brica", "f\u00E1brica"],
  ["l", F, "", "l\u00EA"],
  ["L", F, "", "L\u00EA"],
  ["gen", F, "rico", "gen\u00E9rico"],
  ["sa", F, "das", "sa\u00EDdas"],
  ["imut", F, "vel", "imut\u00E1vel"],
  ["espec", F, "fica", "espec\u00EDfica"],
  ["C", F, "rculos", "C\u00EDrculos"],
  ["gr", F, "fica", "gr\u00E1fica"],
  ["v", F, "o", "v\u00E3o"],
  ["m", F, "tricas", "m\u00E9tricas"],
  ["m", F, "trica", "m\u00E9trica"],
  ["seguran", F, "a", "seguran\u00E7a"],
  ["destru", F, "das", "destru\u00EDdas"],
  ["pr", F, "xima", "pr\u00F3xima"],
  ["Mant", F, "m", "Mant\u00E9m"],
  ["num", F, "rica", "num\u00E9rica"],
  ["lan", F, "a", "lan\u00E7a"],
  ["cr", F, "tica", "cr\u00EDtica"],
  ["r", F, "pida", "r\u00E1pida"],
  ["inclu", F, "do", "inclu\u00EDdo"],
  ["cobran", F, "a", "cobran\u00E7a"],
  ["Fam", F, "lia", "Fam\u00EDlia"],
  ["interm", F, "dias", "interm\u00E9dias"],
  ["fracion", F, "ria", "fracion\u00E1ria"],
  ["Toler", F, "ncia", "Toler\u00E2ncia"],
  ["aplic", F, "vel", "aplic\u00E1vel"],
  ["ajust", F, "vel", "ajust\u00E1vel"],
  ["dobradi", F, "a", "dobradi\u00E7a"],
  ["cont", F, "nua", "cont\u00EDnua"],
  ["c", F, "lculo", "c\u00E1lculo"],
  ["unit", F, "rio", "unit\u00E1rio"],
  ["Diagn", F, "stico", "Diagn\u00F3stico"],
  ["pr", F, "", "pr\u00E9"],
  ["p", F, "s", "p\u00F3s"],
  // m� / � / n�
  ["m", F, "", "m\u00B2"],
  ["N", F, "", "N\u00BA"],
  ["C", F, "", "C\u00E9"],
  ["K", F, "", "K\u00E9"],
];

for (const row of WORDS) {
  add(row.slice(0, -1), row[row.length - 1]);
}

// prefixes that lost leading accented char / dash
add([F, "teis"], "\u00FAteis");
add([F, "til"], "\u00FAtil");
add([F, "nica"], "\u00FAnica");
add([F, "nico"], "\u00FAnico");
add([F, "rea"], "\u00E1rea");
add([F, "ndice"], "\u00EDndice");
add([F, "s "], "\u00E0s ");
add([F, "o "], "\u00E3o ");
add([F, "es)"], "\u00F5es)");
add([F, "es "], "\u00F5es ");

// comment / section markers: leading FFFD -> em dash
add(["// ", F], "// \u2014 ");
add(["* ", F], "* \u2014 ");
add(["/** ", F], "/** \u2014 ");
add(['|| "', F, '"'], '|| "\u2014"');
add(['=== "', F, '"'], '=== "\u2014"');
add(['== "', F, '"'], '== "\u2014"');
add(['? "', F, '"'], '? "\u2014"');
add([': "', F, '"'], ': "\u2014"');
add(['"', F, '"'], '"\u2014"');

// dimension / range separators
add(["W", F, "H", F, "T"], "W\u00D7H\u00D7T");
add(["W", F, "H", F, "D"], "W\u00D7H\u00D7D");
add(["W", F, "D", F, "T"], "W\u00D7D\u00D7T");
add(["W", F, "H"], "W\u00D7H");
add(["W", F, "D"], "W\u00D7D");
add([F, "D"], "\u00D7D");
add([F, "T"], "\u00D7T");
add(["largura", F, "altura"], "largura\u00D7altura");
add(["largura", F, "prof"], "largura\u00D7prof");
add(["altura", F, "prof"], "altura\u00D7prof");

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

function fixRanges(text) {
  // digit�digit ranges / products: 300�600, 1�20, 31�0.95
  return text.replace(/(\d)\uFFFD(\d)/g, "$1\u2013$2");
}

function fixText(text) {
  let next = fixRanges(text);
  const sorted = [...PAIRS].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of sorted) {
    if (!from || from === to || from === F) continue;
    if (next.includes(from)) next = next.split(from).join(to);
  }
  // leftover spaced separators
  next = next.split(" " + F + " ").join(" \u2014 ");
  next = next.split(" " + F).join(" \u2014");
  next = next.split(F + " ").join("\u2014 ");
  return next;
}

const roots = ["src", "public/updates", "tests", "core/docs"].filter((r) =>
  fs.existsSync(path.join(ROOT, r)),
);
const files = roots.flatMap((r) => walk(path.join(ROOT, r)));
const changed = [];

for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  if (!before.includes(F)) continue;
  const after = fixText(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changed.push(path.relative(ROOT, file).replace(/\\/g, "/"));
  }
}

let remain = 0;
const remainFiles = [];
for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const n = (fs.readFileSync(file, "utf8").match(/\uFFFD/g) || []).length;
  remain += n;
  if (n) remainFiles.push({ rel, n });
}
remainFiles.sort((a, b) => b.n - a.n);

console.log("FIXED=" + changed.length);
console.log("REMAIN_FFFD=" + remain);
remainFiles.slice(0, 40).forEach((x) => console.log(" " + x.n + "\t" + x.rel));

// key UI checks
for (const f of [
  "src/core/drawers/european/ui/EuropeanDrawerConfigPanel.tsx",
  "src/components/admin/DrawersAdminHubPage.tsx",
]) {
  if (!fs.existsSync(f)) continue;
  const t = fs.readFileSync(f, "utf8");
  console.log(
    "CHECK",
    f,
    "fffd=",
    (t.match(/\uFFFD/g) || []).length,
    t.includes("Gaveta v\u00E1lida") ? "OK_valida" : "MISS_valida",
  );
}
