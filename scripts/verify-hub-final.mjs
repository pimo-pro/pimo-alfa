import fs from "node:fs";
import path from "node:path";

const ROOTS = [
  "src/core/docs/archive",
  "src/core/docs/refs",
  "src/core/docs/progresso",
  "src/pages/documentacao",
  "public/updates",
];

const BAD = [
  /Referncias/,
  /Referncia/,
  /Tcnicas/,
  /tcnicas/,
  /Contedo/,
  /Concludo/,
  /concludas/,
  /Prximas/,
  /Mdulo/,
  /Cdigo/,
  /histrico/,
  /Documentao/,
  /seces /,
  /Seco /,
  /Secao /,
  /substituda/,
  /Substitudo/,
  /Remoo/,
  /Atualizao/,
  /consolidao/,
  /Boto /,
  /Pgina /,
  /ligao/,
  /Normalizao/,
  /Especificaes/,
  /\uFFFD/,
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|json)$/i.test(name) && !name.endsWith(".bak")) out.push(p);
  }
  return out;
}

const issues = [];
const bomFiles = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (file.includes("architectureIndex") || file.includes("_extract_preview")) continue;
    const buf = fs.readFileSync(file);
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) bomFiles.push(file);
    const text = buf.toString("utf8");
    const hits = BAD.filter((re) => re.test(text)).map((re) => re.source);
    if (hits.length) issues.push({ file, hits });
  }
}

const checks = [
  ["hubSections", "src/pages/documentacao/hubSections.ts", "Documenta\u00e7\u00e3o atual"],
  ["hub shell", "src/pages/documentacao/HubDocumentacaoInterna.tsx", "Documenta\u00e7\u00e3o Interna"],
  ["hub shell emdash", "src/pages/documentacao/HubDocumentacaoInterna.tsx", "\u2014"],
  ["maxWidth none", "src/pages/documentacao/HubDocumentacaoInterna.tsx", 'maxWidth: "none"'],
  ["no 1120", "src/pages/documentacao/HubDocumentacaoInterna.tsx", "1120"],
  ["refs NOTE", "src/core/docs/refs/refsNotes.ts", "Especifica\u00e7\u00f5es T\u00e9cnicas"],
  ["removed", "public/updates/removed.json", "P\u00e1gina Documentation"],
  ["progresso", "src/pages/documentacao/HubProgressoContent.tsx", "Conclu\u00eddo"],
  ["refs UI", "src/pages/documentacao/HubRefsContent.tsx", "M\u00f3dulo"],
  ["historico UI", "src/pages/documentacao/HubHistoricoContent.tsx", "hist\u00f3rico"],
];

console.log(JSON.stringify({ issueCount: issues.length, issues, bomFiles }, null, 2));
for (const [label, f, s] of checks) {
  const t = fs.readFileSync(f, "utf8");
  const ok = label.startsWith("no ") ? !t.includes(s) : t.includes(s);
  console.log(ok ? "PASS" : "FAIL", label);
}

// refs notes count
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
try {
  const { pathToFileURL } = await import("node:url");
} catch {}
