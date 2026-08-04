#!/usr/bin/env node
/** Residual pass 3  vocabulario restante dos relatorios (\\u escapes). */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const F = "\uFFFD";
const SKIP_DIR = new Set(["node_modules", "dist", "build", ".git", "coverage", "tmp", "data", "ANTUNIS", "cnc"]);
const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".html", ".css", ".txt"]);
const P = [];
const a = (parts, to) => {
  const from = parts.join("");
  if (from && from !== to && from !== F) P.push([from, to]);
};

const rows = [
  ["CONDI", F, F, "ES", "CONDI\u00C7\u00D5ES"],
  ["separa", F, "o", "separa\u00E7\u00E3o"],
  ["Separa", F, "o", "Separa\u00E7\u00E3o"],
  ["Duplica", F, "o", "Duplica\u00E7\u00E3o"],
  ["duplica", F, "o", "duplica\u00E7\u00E3o"],
  ["Localiza", F, "o", "Localiza\u00E7\u00E3o"],
  ["localiza", F, "o", "Localiza\u00E7\u00E3o"],
  ["m", F, "todos", "m\u00E9todos"],
  ["M", F, "todos", "M\u00E9todos"],
  ["diferen", F, "as", "diferen\u00E7as"],
  ["Diferen", F, "as", "Diferen\u00E7as"],
  ["diferen", F, "a", "diferen\u00E7a"],
  ["Diferen", F, "a", "Diferen\u00E7a"],
  ["Pr", F, "ximas", "Pr\u00F3ximas"],
  ["pr", F, "ximas", "pr\u00F3ximas"],
  ["Pr", F, "ximo", "Pr\u00F3ximo"],
  ["pr", F, "ximo", "pr\u00F3ximo"],
  ["Pr", F, "xima", "Pr\u00F3xima"],
  ["pr", F, "xima", "pr\u00F3xima"],
  ["A", F, F, "O", "A\u00C7\u00C3O"],
  ["A", F, F, "ES", "A\u00C7\u00D5ES"],
  ["SUGEST", F, "ES", "SUGEST\u00D5ES"],
  ["OTIMIZA", F, F, "O", "OTIMIZA\u00C7\u00C3O"],
  ["Memoiza", F, "o", "Memoiza\u00E7\u00E3o"],
  ["memoiza", F, "o", "memoiza\u00E7\u00E3o"],
  ["CONCLUS", F, "O", "CONCLUS\u00C3O"],
  ["CONCLUS\u00D3O", "CONCLUS\u00C3O"],
  ["RECOMENDA", F, F, "ES", "RECOMENDA\u00C7\u00D5ES"],
  ["escal", F, "vel", "escal\u00E1vel"],
  ["cont", F, "nua", "cont\u00EDnua"],
  ["DOCUMENTA", F, F, "O", "DOCUMENTA\u00C7\u00C3O"],
  ["din", F, "micas", "din\u00E2micas"],
  ["din", F, "mica", "din\u00E2mica"],
  ["Reposit", F, "rio", "Reposit\u00F3rio"],
  ["reposit", F, "rio", "reposit\u00F3rio"],
  ["F", F, "rmula", "F\u00F3rmula"],
  ["f", F, "rmula", "f\u00F3rmula"],
  ["Espa", F, "o", "Espa\u00E7o"],
  ["espa", F, "o", "espa\u00E7o"],
  ["espa", F, "amento", "espa\u00E7amento"],
  ["DISTRIBUI", F, F, "O", "DISTRIBUI\u00C7\u00C3O"],
  ["anima", F, "o", "anima\u00E7\u00E3o"],
  ["Anima", F, "o", "Anima\u00E7\u00E3o"],
  ["VALIDA", F, F, "ES", "VALIDA\u00C7\u00D5ES"],
  ["NUM", F, "RICAS", "NUM\u00C9RICAS"],
  ["num", F, "rica", "num\u00E9rica"],
  ["num", F, "ricas", "num\u00E9ricas"],
  ["Sa", F, "da", "Sa\u00EDda"],
  ["sa", F, "da", "sa\u00EDda"],
  ["redu", F, "o", "redu\u00E7\u00E3o"],
  ["Vari", F, "vel", "Vari\u00E1vel"],
  ["vari", F, "vel", "vari\u00E1vel"],
  ["sec", F, "es", "sec\u00E7\u00F5es"],
  ["Sec", F, "es", "Sec\u00E7\u00F5es"],
  ["aplic", F, "vel", "aplic\u00E1vel"],
  ["verific", F, "veis", "verific\u00E1veis"],
  ["fabric", F, "veis", "fabric\u00E1veis"],
  ["fabric", F, "vel", "fabric\u00E1vel"],
  ["Customiza", F, "o", "Customiza\u00E7\u00E3o"],
  ["customiza", F, "o", "customiza\u00E7\u00E3o"],
  ["alum", F, "nio", "alum\u00EDnio"],
  ["V", F, "deo", "V\u00EDdeo"],
  ["Extra", F, "o", "Extra\u00E7\u00E3o"],
  ["extra", F, "o", "extra\u00E7\u00E3o"],
  ["Dom", F, "nio", "Dom\u00EDnio"],
  ["dom", F, "nio", "dom\u00EDnio"],
  ["PRODU", F, F, "O", "PRODU\u00C7\u00C3O"],
  ["rela", F, "o", "rela\u00E7\u00E3o"],
  ["telesc", F, "picas", "telesc\u00F3picas"],
  ["reconstru", F, "da", "reconstru\u00EDda"],
  ["reconstru", F, "do", "reconstru\u00EDdo"],
  ["REFER", F, "NCIAS", "REFER\u00CANCIAS"],
  ["Refer", F, "ncias", "Refer\u00EAncias"],
  ["Sum", F, "rio", "Sum\u00E1rio"],
  ["aplica", F, "o", "aplica\u00E7\u00E3o"],
  ["Aplica", F, "o", "Aplica\u00E7\u00E3o"],
  ["M", F, "trica", "M\u00E9trica"],
  ["m", F, "trica", "m\u00E9trica"],
  ["Remo", F, "o", "Remo\u00E7\u00E3o"],
  ["remo", F, "o", "remo\u00E7\u00E3o"],
  ["AP", F, "S", "AP\u00D3S"],
  ["expans", F, "o", "expans\u00E3o"],
  ["expans\u00D3o", "expans\u00E3o"],
  ["revis", F, "o", "revis\u00E3o"],
  ["revis\u00D3o", "revis\u00E3o"],
  ["M\u00D7DIO", "M\u00C9DIO"],
  ["\u00EDmanes", "\u00EDmanes"],
  ["(", F, "manes", "(\u00EDmanes"],
  ["Dobradi", F, "a", "Dobradi\u00E7a"],
  ["dobradi", F, "a", "dobradi\u00E7a"],
  ["edit", F, "veis", "edit\u00E1veis"],
  ["MUDAN", F, "AS", "MUDAN\u00C7AS"],
  ["Priorit", F, "rio", "Priorit\u00E1rio"],
  ["priorit", F, "rio", "priorit\u00E1rio"],
  ["Conclu", F, "da", "Conclu\u00EDda"],
  ["conclu", F, "da", "conclu\u00EDda"],
  ["Vari", F, "veis", "Vari\u00E1veis"],
  ["vari", F, "veis", "vari\u00E1veis"],
  ["diret", F, "rio", "diret\u00F3rio"],
  ["Fa", F, "a", "Fa\u00E7a"],
  ["evolu", F, "o", "evolu\u00E7\u00E3o"],
  ["permane", F, "a", "permane\u00E7a"],
  ["ativa", F, "o", "ativa\u00E7\u00E3o"],
  ["for", F, "a", "for\u00E7a"],
  ["Fr", F, "gil", "Fr\u00E1gil"],
  ["Correc", F, F, "o", "Corre\u00E7\u00E3o"],
  ["os tr", F, "s ", "os tr\u00EAs "],
  ["contr", F, "rio", "contr\u00E1rio"],
  ["protec", F, "\u00E3o", "protec\u00E7\u00E3o"],
  ["sint", F, "tico", "sint\u00E9tico"],
  ["t", F, "picos", "t\u00EDpicos"],
  ["correc", F, "\u00F5es", "corre\u00E7\u00F5es"],
  ["for", F, "a material", "for\u00E7a material"],
  ["for", F, "a ", "for\u00E7a "],
  ["simula", F, "o", "simula\u00E7\u00E3o"],
  ["Renderiza", F, "o", "Renderiza\u00E7\u00E3o"],
  ["renderiza", F, "o", "renderiza\u00E7\u00E3o"],
  ["ANIMA", F, F, "O", "ANIMA\u00C7\u00C3O"],
  ["PE", F, "AS", "PE\u00C7AS"],
  ["\u00C9Gerar", "\u00ABGerar"],
  [" ", F, "Gerar", " \u00ABGerar"],
  ["t\u00E9c\u00FAnica", "t\u00E9cnica"],
  ["t\u00E9c\u00FAnicos", "t\u00E9cnicos"],
  ["\u00E2mbito", "\u00E2mbito"],
  ["protec\u00E7\u00E3o de ", F, "mbito", "protec\u00E7\u00E3o de \u00E2mbito"],
  ["de ", F, "mbito", "de \u00E2mbito"],
  [" ", F, " ", " \u2014 "],
];

for (const r of rows) a(r.slice(0, -1), r[r.length - 1]);

function skip(rel) {
  const n = rel.replace(/\\/g, "/");
  return /fix-pt-encoding|fix-hub-encoding|auditPortuguese|audit-hub|repair-hub|build-output|publish-output|^tmp-|\.xml$|\.tcn$|\/cnc\//.test(n);
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
let before = 0, after = 0;
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
console.log(JSON.stringify({ filesChanged: changed.length, fffdBefore: before, fffdAfter: after, top: changed.slice(0, 20) }, null, 2));
