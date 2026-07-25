import fs from "node:fs";
import path from "node:path";

const ROOTS = [
  "src/core/docs/archive",
  "src/core/docs/refs",
  "src/core/docs/progresso",
  "src/pages/documentacao",
  "public/updates",
];

const MOJIBAKE = [
  "\u251c\u00ba", // ?∫
  "\u251c\u00a3", // ?£
  "\u251c\u00a1", // ?°
  "\u251c\u00a9", // ?©
  "\u00c3\u00a1", // √°
  "\u00c3\u00a9", // √©
  "\u00c3\u00a7", // √ß
  "\u00c3\u00a3", // √£
  "\u00c3\u00b3", // √≥
  "\u00c3\u00ba", // √∫
  "\u00ef\u00bf\u00bd", // UTF-8 of FFFD as Latin-1
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|json|mjs|bak)$/i.test(name)) out.push(p);
  }
  return out;
}

const issues = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const buf = fs.readFileSync(file);
    const bom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const text = buf.toString("utf8");
    const fffd = (text.match(/\uFFFD/g) || []).length;
    const moji = MOJIBAKE.filter((m) => text.includes(m));
    // sample latin accents present
    const hasLatin = /[·ÈÌÛ˙Á„ı¡…Õ”⁄«√’]/.test(text);
    if (bom || fffd || moji.length) {
      issues.push({ file, bom, fffd, moji, hasLatin });
    }
  }
}

console.log(JSON.stringify({ issueCount: issues.length, issues }, null, 2));

// Spot-check key strings
const checks = [
  ["src/pages/documentacao/hubSections.ts", "Documenta\u00e7\u00e3o atual"],
  ["src/pages/documentacao/hubSections.ts", "\u00cdndice curado"],
  ["src/pages/documentacao/hubSections.ts", "Refer\u00eancias t\u00e9cnicas"],
  ["src/pages/documentacao/HubDocumentacaoInterna.tsx", "Documenta\u00e7\u00e3o Interna"],
  ["src/core/docs/progresso/progressoSections.ts", "Funda\u00e7\u00e3o"],
];
for (const [f, s] of checks) {
  const t = fs.readFileSync(f, "utf8");
  console.log("OK", f.split(/[/\\]/).pop(), s.slice(0, 12), t.includes(s));
}
