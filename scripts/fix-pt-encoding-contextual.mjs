#!/usr/bin/env node
/**
 * Pass contextual: reconstrucao de U+FFFD em texto portugues humano.
 * UTF-8 escapes only. Nao toca CNC / XML / cutlist / IDs industriais.
 *
 * Uso: node scripts/fix-pt-encoding-contextual.mjs
 * Ver: src/core/rules/linguagem-portuguesa.md
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const F = "\uFFFD";
const SKIP_DIR = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  "coverage",
  "tmp",
  "data",
  "ANTUNIS",
  "cnc",
  "cnc-examples-output",
]);
const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".html", ".css", ".txt", ".yml", ".yaml"]);

/** @type {Array<[string, string]>} */
const PAIRS = [];
function add(fromParts, to) {
  const from = fromParts.join("");
  if (!from || from === to || from === F) return;
  PAIRS.push([from, to]);
}

// --- cao / coes (1x e 2x FFFD) ---
for (const [stem, fixed] of [
  ["documenta", "documenta\u00E7\u00E3o"],
  ["Documenta", "Documenta\u00E7\u00E3o"],
  ["informa", "informa\u00E7\u00E3o"],
  ["Informa", "Informa\u00E7\u00E3o"],
  ["INFORMA", "INFORMA\u00C7\u00C3O"],
  ["configura", "configura\u00E7\u00E3o"],
  ["Configura", "Configura\u00E7\u00E3o"],
  ["gera", "gera\u00E7\u00E3o"],
  ["Gera", "Gera\u00E7\u00E3o"],  ["Fura", "Fura\u00E7\u00E3o"],
  ["valida", "valida\u00E7\u00E3o"],
  ["Valida", "Valida\u00E7\u00E3o"],
  ["verifica", "verifica\u00E7\u00E3o"],
  ["Verifica", "Verifica\u00E7\u00E3o"],
  ["publica", "publica\u00E7\u00E3o"],
  ["Publica", "Publica\u00E7\u00E3o"],
  ["migra", "migra\u00E7\u00E3o"],
  ["descri", "descri\u00E7\u00E3o"],
  ["Descri", "Descri\u00E7\u00E3o"],
  ["fun", "fun\u00E7\u00E3o"],
  ["Fun", "Fun\u00E7\u00E3o"],
  ["op", "op\u00E7\u00E3o"],
  ["Op", "Op\u00E7\u00E3o"],
  ["posi", "posi\u00E7\u00E3o"],
  ["Posi", "Posi\u00E7\u00E3o"],
  ["constru", "constru\u00E7\u00E3o"],
  ["Constru", "Constru\u00E7\u00E3o"],
  ["reconstru", "reconstru\u00E7\u00E3o"],
  ["Reconstru", "Reconstru\u00E7\u00E3o"],
  ["RECONSTRU", "RECONSTRU\u00C7\u00C3O"],
  ["exporta", "exporta\u00E7\u00E3o"],
  ["Exporta", "Exporta\u00E7\u00E3o"],
  ["implementa", "implementa\u00E7\u00E3o"],
  ["integra", "integra\u00E7\u00E3o"],
  ["Integra", "Integra\u00E7\u00E3o"],
  ["opera", "opera\u00E7\u00E3o"],
  ["Opera", "Opera\u00E7\u00E3o"],
  ["corre", "corre\u00E7\u00E3o"],
  ["Corre", "Corre\u00E7\u00E3o"],
  ["prote", "prote\u00E7\u00E3o"],
  ["Prote", "Prote\u00E7\u00E3o"],
  ["PROTEC", "PROTEC\u00C7\u00C3O"],
  ["protec", "protec\u00E7\u00E3o"],
  ["normaliza", "normaliza\u00E7\u00E3o"],
  ["Normaliza", "Normaliza\u00E7\u00E3o"],
  ["identifica", "identifica\u00E7\u00E3o"],
  ["execu", "execu\u00E7\u00E3o"],
  ["Execu", "Execu\u00E7\u00E3o"],
  ["resolu", "resolu\u00E7\u00E3o"],
  ["Resolu", "Resolu\u00E7\u00E3o"],
  ["sobreposi", "sobreposi\u00E7\u00E3o"],
  ["substitui", "substitui\u00E7\u00E3o"],
  ["visualiza", "visualiza\u00E7\u00E3o"],
  ["Visualiza", "Visualiza\u00E7\u00E3o"],
  ["fundamenta", "funda\u00E7\u00E3o"],
  ["Funda", "Funda\u00E7\u00E3o"],
  ["funda", "funda\u00E7\u00E3o"],
  ["regenera", "regenera\u00E7\u00E3o"],
  ["altera", "altera\u00E7\u00E3o"],
  ["Altera", "Altera\u00E7\u00E3o"],
  ["sec", "sec\u00E7\u00E3o"],
  ["Sec", "Sec\u00E7\u00E3o"],
  ["esta", "esta\u00E7\u00E3o"],
  ["Esta", "Esta\u00E7\u00E3o"],
  ["invers", "invers\u00E3o"],
  ["Invers", "Invers\u00E3o"],
  ["vers", "vers\u00E3o"],
  ["Vers", "Vers\u00E3o"],
  ["VERS", "VERS\u00C3O"],
  ["extens", "extens\u00E3o"],
  ["sele", "sele\u00E7\u00E3o"],
  ["produ", "produ\u00E7\u00E3o"],
  ["defini", "defini\u00E7\u00E3o"],
  ["aten", "aten\u00E7\u00E3o"],
  ["Aten", "Aten\u00E7\u00E3o"],
  ["manuten", "manuten\u00E7\u00E3o"],
  ["orienta", "orienta\u00E7\u00E3o"],
  ["fixa", "fixa\u00E7\u00E3o"],
  ["Fixa", "Fixa\u00E7\u00E3o"],
  ["coloca", "coloca\u00E7\u00E3o"],
  ["eleva", "eleva\u00E7\u00E3o"],
  ["ocupa", "ocupa\u00E7\u00E3o"],
  ["apresenta", "apresenta\u00E7\u00E3o"],
  ["unifica", "unifica\u00E7\u00E3o"],
  ["classifica", "classifica\u00E7\u00E3o"],
  ["formata", "formata\u00E7\u00E3o"],
  ["combina", "combina\u00E7\u00E3o"],
  ["simula", "simula\u00E7\u00E3o"],
  ["serializa", "serializa\u00E7\u00E3o"],
  ["sanitiza", "sanitiza\u00E7\u00E3o"],
  ["otimiza", "otimiza\u00E7\u00E3o"],
  ["edi", "edi\u00E7\u00E3o"],
  ["omiss", "omiss\u00E3o"],
  ["inser", "inser\u00E7\u00E3o"],
  ["Inser", "Inser\u00E7\u00E3o"],
  ["interse", "interse\u00E7\u00E3o"],
  ["orquestra", "orquestra\u00E7\u00E3o"],
  ["monetiza", "monetiza\u00E7\u00E3o"],
  ["reconcilia", "reconcilia\u00E7\u00E3o"],
  ["consolida", "consolida\u00E7\u00E3o"],
  ["renderiza", "renderiza\u00E7\u00E3o"],
  ["memoiza", "memoiza\u00E7\u00E3o"],
  ["muta", "muta\u00E7\u00E3o"],
  ["fra", "fra\u00E7\u00E3o"],
  ["rota", "rota\u00E7\u00E3o"],
]) {
  add([stem, F, F, "o"], fixed);
  add([stem, F, "o"], fixed);
}

for (const [stem, fixed] of [
  ["altera", "altera\u00E7\u00F5es"],
  ["Altera", "Altera\u00E7\u00F5es"],
  ["observa", "observa\u00E7\u00F5es"],
  ["opera", "opera\u00E7\u00F5es"],
  ["Opera", "Opera\u00E7\u00F5es"],
  ["corre", "corre\u00E7\u00F5es"],
  ["Corre", "Corre\u00E7\u00F5es"],
  ["fun", "fun\u00E7\u00F5es"],
  ["op", "op\u00E7\u00F5es"],
  ["sec", "sec\u00E7\u00F5es"],
  ["valida", "valida\u00E7\u00F5es"],
  ["dimens", "dimens\u00F5es"],
  ["Dimens", "Dimens\u00F5es"],
  ["exporta", "exporta\u00E7\u00F5es"],
  ["integra", "integra\u00E7\u00F5es"],
  ["rela", "rela\u00E7\u00F5es"],
  ["posi", "posi\u00E7\u00F5es"],
  ["descri", "descri\u00E7\u00F5es"],
  ["informa", "informa\u00E7\u00F5es"],
  ["Informa", "Informa\u00E7\u00F5es"],
  ["INFORMA", "INFORMA\u00C7\u00D5ES"],
  ["configura", "configura\u00E7\u00F5es"],
  ["Configura", "Configura\u00E7\u00F5es"],
  ["varia", "varia\u00E7\u00F5es"],
  ["Fura", "Fura\u00E7\u00F5es"],
  ["fura", "fura\u00E7\u00F5es"],
]) {
  add([stem, F, F, "es"], fixed);
  add([stem, F, "es"], fixed);
}

// palavras / fragmentos frequentes no inventario PIMO
const WORDS = [
  ["Relat", F, "rio", "Relat\u00F3rio"],
  ["relat", F, "rio", "relat\u00F3rio"],
  ["RELAT", F, "RIO", "RELAT\u00D3RIO"],
  ["T", F, "cnico", "T\u00E9cnico"],
  ["t", F, "cnico", "t\u00E9cnico"],
  ["T", F, "CNICO", "T\u00C9CNICO"],
  ["T", F, "cnica", "T\u00E9cnica"],
  ["t", F, "cnica", "t\u00E9cnica"],
  ["t", F, "cnicas", "t\u00E9cnicas"],
  ["An", F, "lise", "An\u00E1lise"],
  ["an", F, "lise", "an\u00E1lise"],
  ["AN", F, "LISE", "AN\u00C1LISE"],
  ["diagn", F, "stico", "diagn\u00F3stico"],
  ["Diagn", F, "stico", "Diagn\u00F3stico"],
  ["mat", F, "ria", "mat\u00E9ria"],
  ["Mat", F, "ria", "Mat\u00E9ria"],
  ["mat", F, "rias", "mat\u00E9rias"],
  ["m", F, "dulo", "m\u00F3dulo"],
  ["M", F, "dulo", "M\u00F3dulo"],
  ["M", F, "DULO", "M\u00D3DULO"],
  ["m", F, "dulos", "m\u00F3dulos"],
  ["cl", F, "ssic", "cl\u00E1ssic"],
  ["Cl", F, "ssic", "Cl\u00E1ssic"],
  ["n", F, "o", "n\u00E3o"],
  ["N", F, "o", "N\u00E3o"],
  ["N", F, "O", "N\u00C3O"],
  ["est", F, "o", "est\u00E3o"],
  ["Est", F, "o", "Est\u00E3o"],
  ["est", F, " ", "est\u00E1 "],
  ["est", F, "vel", "est\u00E1vel"],
  ["Est", F, "vel", "Est\u00E1vel"],
  ["j", F, " ", "j\u00E1 "],
  ["j", F, "est", "j\u00E1 est"],
  ["cont", F, "m", "cont\u00E9m"],
  ["reposit", F, "rio", "reposit\u00F3rio"],
  ["min", F, "sculas", "min\u00FAsculas"],
  ["necess", F, "ria", "necess\u00E1ria"],
  ["necess", F, "rio", "necess\u00E1rio"],
  ["rid", F, "culo", "rid\u00EDculo"],
  ["padr", F, "o", "padr\u00E3o"],
  ["Padr", F, "o", "Padr\u00E3o"],
  ["pe", F, "a", "pe\u00E7a"],
  ["Pe", F, "a", "Pe\u00E7a"],
  ["pe", F, "as", "pe\u00E7as"],
  ["Pe", F, "as", "Pe\u00E7as"],
  ["corredi", F, "a", "corredi\u00E7a"],
  ["Corredi", F, "a", "Corredi\u00E7a"],
  ["corredi", F, "as", "corredi\u00E7as"],
  ["cat", F, "logo", "cat\u00E1logo"],
  ["Cat", F, "logo", "Cat\u00E1logo"],
  ["ap", F, "s", "ap\u00F3s"],
  ["Ap", F, "s", "Ap\u00F3s"],
  ["pr", F, "-", "pr\u00E9-"],
  ["Pr", F, "-", "Pr\u00E9-"],
  ["pr", F, "prio", "pr\u00F3prio"],
  ["pr", F, "pria", "pr\u00F3pria"],
  ["pr", F, "ximo", "pr\u00F3ximo"],
  ["tamb", F, "m", "tamb\u00E9m"],
  ["al", F, "m", "al\u00E9m"],
  ["atrav", F, "s", "atrav\u00E9s"],
  ["s", F, " ", "s\u00F3 "],
  ["S", F, " ", "S\u00F3 "],
  ["s", F, " em", "s\u00F3 em"],
  ["m", F, "nimo", "m\u00EDnimo"],
  ["m", F, "ximo", "m\u00E1ximo"],
  ["m", F, "xima", "m\u00E1xima"],
  ["nica", "\u00FAnica"], // via prefix
  ["nico", "\u00FAnico"],
  ["til", "\u00FAtil"],
  ["f", F, "sico", "f\u00EDsico"],
  ["f", F, "sica", "f\u00EDsica"],
  ["Ordem f", F, "sica", "Ordem f\u00EDsica"],
  ["dispon", F, "vel", "dispon\u00EDvel"],
  ["dispon", F, "veis", "dispon\u00EDveis"],
  ["v", F, "lida", "v\u00E1lida"],
  ["v", F, "lido", "v\u00E1lido"],
  ["inv", F, "lida", "inv\u00E1lida"],
  ["Hist", F, "rico", "Hist\u00F3rico"],
  ["hist", F, "rico", "hist\u00F3rico"],
  ["Respons", F, "vel", "Respons\u00E1vel"],
  ["T", F, "tulo", "T\u00EDtulo"],
  ["p", F, "gina", "p\u00E1gina"],
  ["p", F, "ginas", "p\u00E1ginas"],
  ["c", F, "digo", "c\u00F3digo"],
  ["C", F, "digo", "C\u00F3digo"],
  ["refer", F, "ncia", "refer\u00EAncia"],
  ["Refer", F, "ncia", "Refer\u00EAncia"],
  ["l", F, "gica", "l\u00F3gica"],
  ["conte", F, "do", "conte\u00FAdo"],
  ["n", F, "mero", "n\u00FAmero"],
  ["N", F, "mero", "N\u00FAmero"],
  ["pre", F, "o", "pre\u00E7o"],
  ["Pre", F, "o", "Pre\u00E7o"],
  ["or", F, "amentos", "or\u00E7amentos"],
  ["Or", F, "amentos", "Or\u00E7amentos"],
  ["avan", F, "ado", "avan\u00E7ado"],
  ["Avan", F, "ado", "Avan\u00E7ado"],
  ["avan", F, "adas", "avan\u00E7adas"],
  ["cen", F, "rio", "cen\u00E1rio"],
  ["rodap", F, "", "rodap\u00E9"],
  ["autom", F, "tico", "autom\u00E1tico"],
  ["autom", F, "tica", "autom\u00E1tica"],
  ["sequ", F, "ncia", "sequ\u00EAncia"],
  ["mant", F, "m", "mant\u00E9m"],
  ["conclu", F, "do", "conclu\u00EDdo"],
  ["expl", F, "cito", "expl\u00EDcito"],
  ["usu", F, "rio", "usu\u00E1rio"],
  ["dom", F, "nio", "dom\u00EDnio"],
  ["mem", F, "ria", "mem\u00F3ria"],
  ["gr", F, "fico", "gr\u00E1fico"],
  ["unit", F, "rio", "unit\u00E1rio"],
  ["reutiliz", F, "vel", "reutiliz\u00E1vel"],
  ["ergon", F, "mica", "ergon\u00F3mica"],
  ["colis", F, "es", "colis\u00F5es"],
  ["simult", F, "neo", "simult\u00E2neo"],
  ["constr", F, "i", "constr\u00F3i"],
  ["Constr", F, "i", "Constr\u00F3i"],
  ["sobrep", F, "e", "sobrep\u00F5e"],
  ["atr", F, "s", "atr\u00E1s"],
  ["at", F, " ", "at\u00E9 "],
  ["mudan", F, "a", "mudan\u00E7a"],
  ["consist", F, "ncia", "consist\u00EAncia"],
  ["m", F, "o de obra", "m\u00E3o de obra"],
  ["Vis", F, "vel", "Vis\u00EDvel"],
  ["vis", F, "vel", "vis\u00EDvel"],
  // diametros / simbolos industriais em texto
  ["furos ", F, "5", "furos \u00D85"],
  ["furo ", F, "10", "furo \u00D810"],
  ["furos ", F, "10", "furos \u00D810"],
  ["", F, "4 ?", "\u00D84 ?"],
  ["", F, "5", "\u00D85"],
  ["", F, "10", "\u00D810"],
  ["", F, "30", "\u00D730"],
  ["10", F, "30", "10\u00D730"],
  ["10", F, "40", "10\u00D740"],
  ["(", F, "=0)", "(\u00D8=0)"],
  ["(", F, "${", "(\u00B1${"],
  ["(", F, ")", "(\u20AC)"],
  ["1", F, ".", "1\u20AC."],
  ["/", F, ")", "/\u20AC)"],
  ["/", F, "/kg)", "/\u20AC/kg)"],
  ["estranhos ('", F, F, "')", "estranhos (U+FFFD)"],
  ["partidos ('", F, F, "')", "partidos (U+FFFD)"],
  ["partidos (", F, F, ")", "partidos (mojibake)"],
  ["estranhos (", F, F, ")", "estranhos (mojibake)"],
];

for (const row of WORDS) {
  const to = row[row.length - 1];
  const fromParts = row.slice(0, -1);
  if (fromParts.join("") === to) continue;
  add(fromParts, to);
}


for (const [stem, fixed] of [
  ["Migra", "Migra\u00E7\u00E3o"],
  ["comunica", "comunica\u00E7\u00E3o"],
  ["Comunica", "Comunica\u00E7\u00E3o"],
  ["notifica", "notifica\u00E7\u00E3o"],
  ["Notifica", "Notifica\u00E7\u00E3o"],
  ["sincroniza", "sincroniza\u00E7\u00E3o"],
  ["Sincroniza", "Sincroniza\u00E7\u00E3o"],
  ["inicializa", "inicializa\u00E7\u00E3o"],
  ["parametriza", "parametriza\u00E7\u00E3o"],
  ["caracteriza", "caracteriza\u00E7\u00E3o"],
  ["autoriza", "autoriza\u00E7\u00E3o"],
  ["padroniza", "padroniza\u00E7\u00E3o"],
  ["personaliza", "personaliza\u00E7\u00E3o"],
  ["industrializa", "industrializa\u00E7\u00E3o"],
  ["fabrica", "fabrica\u00E7\u00E3o"],
  ["Fabrica", "Fabrica\u00E7\u00E3o"],
  ["inspe", "inspe\u00E7\u00E3o"],
  ["Inspe", "Inspe\u00E7\u00E3o"],
  ["detec", "detec\u00E7\u00E3o"],
  ["Detec", "Detec\u00E7\u00E3o"],
  ["navega", "navega\u00E7\u00E3o"],
  ["Navega", "Navega\u00E7\u00E3o"],
  ["organiza", "organiza\u00E7\u00E3o"],
  ["Organiza", "Organiza\u00E7\u00E3o"],
  ["autentica", "autentica\u00E7\u00E3o"],
  ["Autentica", "Autentica\u00E7\u00E3o"],
  ["estimativa", "estimativa\u00E7\u00E3o"],
  ["parametri", "parametri\u00E7\u00E3o"],
  ["Parametri", "Parametri\u00E7\u00E3o"],]) {
  add([stem, F, F, "o"], fixed);
  add([stem, F, "o"], fixed);
}

for (const [stem, fixed] of [
  ["Observa", "Observa\u00E7\u00F5es"],
  ["observa", "observa\u00E7\u00F5es"],
  ["Fura", "Fura\u00E7\u00F5es"],
  ["fura", "fura\u00E7\u00F5es"],
  ["exporta", "exporta\u00E7\u00F5es"],
  ["integra", "integra\u00E7\u00F5es"],
  ["rela", "rela\u00E7\u00F5es"],
  ["varia", "varia\u00E7\u00F5es"],
  ["configura", "configura\u00E7\u00F5es"],
  ["Configura", "Configura\u00E7\u00F5es"],
  ["informa", "informa\u00E7\u00F5es"],
  ["Informa", "Informa\u00E7\u00F5es"],
]) {
  add([stem, F, F, "es"], fixed);
  add([stem, F, "es"], fixed);
}

const EXTRA_WORDS = [
  ["Gaveta v", F, "lida", "Gaveta v\u00E1lida"],
  ["Gaveta inv", F, "lida", "Gaveta inv\u00E1lida"],
  ["v", F, "lidos", "v\u00E1lidos"],
  ["V", F, "lidos", "V\u00E1lidos"],
  ["inv", F, "lido", "inv\u00E1lido"],
  ["inv", F, "lidos", "inv\u00E1lidos"],
  ["Inv", F, "lida", "Inv\u00E1lida"],
  ["Inv", F, "lidos", "Inv\u00E1lidos"],
  ["c", F, "digos", "c\u00F3digos"],
  ["n", F, "cleo", "n\u00FAcleo"],
  ["f", F, "sicos", "f\u00EDsicos"],
  ["f", F, "sicas", "f\u00EDsicas"],
  ["refer", F, "ncias", "refer\u00EAncias"],
  ["l", F, "gicas", "l\u00F3gicas"],
  ["l", F, "gico", "l\u00F3gico"],
  ["gr", F, "ficos", "gr\u00E1ficos"],
  ["conte", F, "dos", "conte\u00FAdos"],
  ["unit", F, "rias", "unit\u00E1rias"],
  ["unit", F, "rios", "unit\u00E1rios"],
  ["expl", F, "cita", "expl\u00EDcita"],
  ["sem", F, "ntico", "sem\u00E2ntico"],
  ["reutiliz", F, "veis", "reutiliz\u00E1veis"],
  ["ergon", F, "micas", "ergon\u00F3micas"],
  ["autom", F, "ticos", "autom\u00E1ticos"],
  ["t", F, "tulo", "t\u00EDtulo"],
  ["p", F, "gs", "p\u00E1gs"],
  ["P", F, "ginas", "P\u00E1ginas"],
  ["V", F, "lida", "V\u00E1lida"],
  ["V", F, "lido", "V\u00E1lido"],
  ["Corredi", F, "as", "Corredi\u00E7as"],
  ["respons", F, "vel", "respons\u00E1vel"],
  ["cl", F, "ssica", "cl\u00E1ssica"],
  ["Cl", F, "ssica", "Cl\u00E1ssica"],
  ["An", F, "lises", "An\u00E1lises"],
  ["an", F, "lises", "an\u00E1lises"],
  ["mat", F, "ria-prima", "mat\u00E9ria-prima"],
  ["ferragem", F, "s", "ferragens"],
  ["Ferragem", F, "s", "Ferragens"],
  ["etiqueta", F, "s", "etiquetas"],
  ["Etiqueta", F, "s", "Etiquetas"],
  ["supervisor", F, "ia", "supervis\u00F3ria"],
  ["Supervisor", F, "ia", "Supervis\u00F3ria"],
  ["ordem de produ", F, "o", "ordem de produ\u00E7\u00E3o"],
  ["Ordem de produ", F, "o", "Ordem de produ\u00E7\u00E3o"],  ["chapa", F, "s", "chapas"],
  ["Chapa", F, "s", "Chapas"],
  ["roda-p", F, "", "roda-p\u00E9"],
  ["Roda-p", F, "", "Roda-p\u00E9"],
  ["p", F, "s-", "p\u00F3s-"],
  ["P", F, "s-", "P\u00F3s-"],
  ["ser", F, "", "ser\u00E1"],
  ["N", F, " gavetas", "N\u00BA gavetas"],
  ["N", F, " furos", "N\u00BA furos"],
  ["A gerar", F, "", "A gerar\u2026"],
  ["A executar", F, "", "A executar\u2026"],
  ["j", F, "", "j\u00E1"],
  ["J", F, "", "J\u00E1"],
  ["s", F, "", "s\u00F3"],
  ["S", F, "", "S\u00F3"],
  ["at", F, "", "at\u00E9"],
  ["est", F, "", "est\u00E1"],
  ["Est", F, "", "Est\u00E1"],
];
for (const row of EXTRA_WORDS) {
  const to = row[row.length - 1];
  const fromParts = row.slice(0, -1);
  if (fromParts.join("") === to) continue;
  add(fromParts, to);
}
// prefixos (FFFD no inicio do token)
add([F, "til"], "\u00FAtil");
add([F, "teis"], "\u00FAteis");
add([F, "nica"], "\u00FAnica");
add([F, "nico"], "\u00FAnico");
add([F, "nicas"], "\u00FAnicas");
add([F, "nicos"], "\u00FAnicos");
add([F, "rea"], "\u00E1rea");
add([F, "reas"], "\u00E1reas");
add([F, "ndice"], "\u00EDndice");
add([F, "ndices"], "\u00EDndices");
add([F, "ngulo"], "\u00E2ngulo");
add([F, "ltimo"], "\u00FAltimo");
add([F, "ltima"], "\u00FAltima");

add(["Pr", F, "-visualiza", F, F, "o"], "Pr\u00E9-visualiza\u00E7\u00E3o");
add(["pr", F, "-visualiza", F, F, "o"], "pr\u00E9-visualiza\u00E7\u00E3o");
add(["Pr", F, "-visualiza", F, "o"], "Pr\u00E9-visualiza\u00E7\u00E3o");
add(["pr", F, "-visualiza", F, "o"], "pr\u00E9-visualiza\u00E7\u00E3o");

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
add([" ", F, " "], " \u2014 ");

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
add(["}" + F + "{"], "}\u2013{");
add(["2" + F + "{"], "2\u00D7{");

const SORTED_PAIRS = [...PAIRS].sort((a, b) => b[0].length - a[0].length);

function normRel(rel) {
  return rel.replace(/\\/g, "/");
}

function shouldSkipFile(rel) {
  const n = normRel(rel);
  const base = path.basename(n);
  if (n.includes("/cnc/")) return true;
  if (n.includes("cnc-examples")) return true;
  if (/\.(xml|tcn|anc)$/i.test(n)) return true;
  if (/^fix-pt-encoding/i.test(base)) return true;
  if (/^fix-hub-encoding/i.test(base)) return true;
  if (/^fix-portuguese-encoding/i.test(base)) return true;
  if (base === "auditPortugueseEncoding.mjs") return true;
  if (base === "audit-hub-encoding.mjs") return true;
  if (base === "repair-hub-utf8.mjs") return true;
  if (base === "build-output.txt") return true;
  if (base === "publish-output.txt") return true;
  if (/^tmp-/.test(base)) return true;
  return false;
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    const rel = path.relative(ROOT, full);
    if (shouldSkipFile(rel)) continue;
    if (ent.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

function readUtf8NoBom(file) {
  const buf = fs.readFileSync(file);
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString("utf8");
  }
  return buf.toString("utf8");
}

function writeUtf8NoBom(file, text) {
  fs.writeFileSync(file, text, { encoding: "utf8" });
}

function countFffd(text) {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 0xfffd) n++;
  }
  return n;
}

function fixRanges(text) {
  return text.replace(/(\d)\uFFFD(\d)/g, "$1\u2013$2");
}

function fixText(text) {
  let next = fixRanges(text);
  for (const [from, to] of SORTED_PAIRS) {
    if (!from || from === to || from === F) continue;
    if (next.includes(from)) next = next.split(from).join(to);
  }
  next = next.split(" " + F + " ").join(" \u2014 ");
  next = next.split(" " + F + '{"').join(" \u2014{\"");
  next = next.split("}" + F).join("}\u2013");
  next = next.split(F + "{").join("\u2013{");
  next = next.split(" " + F).join(" \u2014");
  next = next.split(F + " ").join("\u2014 ");
  return next;
}

const files = walk(ROOT);

let fffdBefore = 0;
for (const file of files) {
  fffdBefore += countFffd(readUtf8NoBom(file));
}

const changedFiles = [];

for (const file of files) {
  const before = readUtf8NoBom(file);
  if (!before.includes(F)) continue;
  const after = fixText(before);
  if (after !== before) {
    writeUtf8NoBom(file, after);
    const rel = normRel(path.relative(ROOT, file));
    changedFiles.push({
      file: rel,
      fffdRemoved: countFffd(before) - countFffd(after),
    });
  }
}

let fffdAfter = 0;
for (const file of files) {
  fffdAfter += countFffd(readUtf8NoBom(file));
}

changedFiles.sort((a, b) => b.fffdRemoved - a.fffdRemoved || a.file.localeCompare(b.file));

const summary = {
  filesScanned: files.length,
  filesChanged: changedFiles.length,
  fffdBefore,
  fffdAfter,
  topChangedFiles: changedFiles.slice(0, 25),
};

console.log(JSON.stringify(summary, null, 2));
