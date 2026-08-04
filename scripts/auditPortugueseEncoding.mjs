#!/usr/bin/env node
/**
 * Auditoria / correcao de encoding portugues (UTF-8 sem BOM).
 * Padroes em escapes \\u  o proprio script nunca se auto-corruppe.
 *
 * Uso:
 *   node scripts/auditPortugueseEncoding.mjs
 *   node scripts/auditPortugueseEncoding.mjs --fix
 *   node scripts/auditPortugueseEncoding.mjs --ci
 *   node scripts/auditPortugueseEncoding.mjs --ci --strict
 *
 * Ver: src/core/rules/linguagem-portuguesa.md
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const FIX = process.argv.includes("--fix");
const CI = process.argv.includes("--ci");
const STRICT = process.argv.includes("--strict");

const EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yaml",
  ".yml",
  ".html",
  ".css",
  ".txt",
  ".mdc",
]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".vite",
  "tmp-drill-qa",
  "tmp",
  "data",
]);

/** Constroi string a partir de codepoints (seguro em qualquer codepage). */
const u = (...cps) => String.fromCodePoint(...cps);

/**
 * Mojibake classico: UTF-8 lido como Latin-1/Windows-1252.
 * Ex.: bytes C3 A9 (e acute) lidos como U+00C3 U+00A9 => ""
 */
const MOJIBAKE_MAP = [
  [u(0xc3, 0xa1), u(0xe1)],
  [u(0xc3, 0xa0), u(0xe0)],
  [u(0xc3, 0xa3), u(0xe3)],
  [u(0xc3, 0xa2), u(0xe2)],
  [u(0xc3, 0xa4), u(0xe4)],
  [u(0xc3, 0xa9), u(0xe9)],
  [u(0xc3, 0xa8), u(0xe8)],
  [u(0xc3, 0xaa), u(0xea)],
  [u(0xc3, 0xab), u(0xeb)],
  [u(0xc3, 0xad), u(0xed)],
  [u(0xc3, 0xac), u(0xec)],
  [u(0xc3, 0xae), u(0xee)],
  [u(0xc3, 0xaf), u(0xef)],
  [u(0xc3, 0xb3), u(0xf3)],
  [u(0xc3, 0xb2), u(0xf2)],
  [u(0xc3, 0xb5), u(0xf5)],
  [u(0xc3, 0xb4), u(0xf4)],
  [u(0xc3, 0xb6), u(0xf6)],
  [u(0xc3, 0xba), u(0xfa)],
  [u(0xc3, 0xb9), u(0xf9)],
  [u(0xc3, 0xbb), u(0xfb)],
  [u(0xc3, 0xbc), u(0xfc)],
  [u(0xc3, 0xa7), u(0xe7)],
  [u(0xc3, 0xb1), u(0xf1)],
  [u(0xc3, 0x81), u(0xc1)],
  [u(0xc3, 0x80), u(0xc0)],
  [u(0xc3, 0x83), u(0xc3)],
  [u(0xc3, 0x82), u(0xc2)],
  [u(0xc3, 0x89), u(0xc9)],
  [u(0xc3, 0x88), u(0xc8)],
  [u(0xc3, 0x8a), u(0xca)],
  [u(0xc3, 0x8d), u(0xcd)],
  [u(0xc3, 0x93), u(0xd3)],
  [u(0xc3, 0x92), u(0xd2)],
  [u(0xc3, 0x95), u(0xd5)],
  [u(0xc3, 0x94), u(0xd4)],
  [u(0xc3, 0x9a), u(0xda)],
  [u(0xc3, 0x9b), u(0xdb)],
  [u(0xc3, 0x87), u(0xc7)],
  [u(0xc3, 0x91), u(0xd1)],
  // NBSP partido (C2 A0 como dois chars Latin-1)
  [u(0xc2, 0xa0), " "],
].sort((a, b) => b[0].length - a[0].length);

function shouldSkipFile(relPath) {
  const base = relPath.replace(/\\/g, "/");
  if (base.startsWith("tmp-") || base.includes("/tmp-")) return true;
  if (base === "package-lock.json") return true;
  if (base.startsWith("data/")) return true;
  if (base.includes("cnc-examples-output/")) return true;
  // Scripts que intencionalmente contm padroes mojibake / escapes.
  if (base.endsWith("scripts/auditPortugueseEncoding.mjs")) return true;
  if (base.endsWith("scripts/audit-hub-encoding.mjs")) return true;
  if (base.endsWith("scripts/repair-hub-utf8.mjs")) return true;
  if (base.includes("scripts/fix-pt-encoding")) return true;
  if (base.includes("scripts/fix-hub-encoding")) return true;
  if (base.includes("scripts/fix-portuguese-encoding")) return true;
  // Guardas runtime constroem needles via fromCodePoint; excluir testes que montam mojibake.
  if (base.endsWith("portugueseEncodingGuard.test.ts")) return true;
  return false;
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    if (e.name.startsWith("tmp-") && e.isDirectory()) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(e.name).toLowerCase())) out.push(p);
  }
  return out;
}

function countNeedle(text, needle) {
  if (!needle) return 0;
  let n = 0;
  let i = 0;
  while ((i = text.indexOf(needle, i)) !== -1) {
    n += 1;
    i += needle.length;
  }
  return n;
}

function countReplacement(text) {
  return countNeedle(text, "\uFFFD");
}

function countMojibake(text) {
  let n = 0;
  for (const [bad] of MOJIBAKE_MAP) n += countNeedle(text, bad);
  return n;
}

function fixMojibake(text) {
  let out = text;
  for (const [bad, good] of MOJIBAKE_MAP) {
    if (bad && out.includes(bad)) out = out.split(bad).join(good);
  }
  return out;
}

function main() {
  const files = walk(ROOT);
  const report = [];
  let fixedFiles = 0;
  let totalReplacement = 0;
  let totalMojibake = 0;
  let totalBom = 0;

  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (shouldSkipFile(rel)) continue;
    let buf;
    try {
      buf = readFileSync(file);
    } catch {
      continue;
    }
    if (buf.includes(0)) continue;
    const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const text = hasBom ? buf.slice(3).toString("utf8") : buf.toString("utf8");
    const replacement = countReplacement(text);
    const mojibake = countMojibake(text);
    if (replacement === 0 && mojibake === 0 && !hasBom) continue;

    totalReplacement += replacement;
    totalMojibake += mojibake;
    if (hasBom) totalBom += 1;

    let next = text;
    if (FIX && mojibake > 0) next = fixMojibake(next);

    const remainingReplacement = countReplacement(next);
    const remainingMojibake = countMojibake(next);

    if (FIX && (next !== text || hasBom)) {
      // UTF-8 sem BOM
      writeFileSync(file, next, { encoding: "utf8" });
      fixedFiles += 1;
    }

    report.push({
      file: rel,
      replacement,
      mojibake,
      hasBom,
      remainingReplacement,
      remainingMojibake,
    });
  }

  report.sort((a, b) => b.mojibake + b.replacement - (a.mojibake + a.replacement));

  console.log(
    JSON.stringify(
      {
        mode: FIX ? "fix" : CI ? "ci" : "audit",
        filesScanned: files.length,
        filesWithIssues: report.length,
        totalReplacement,
        totalMojibake,
        totalBom,
        fixedFiles,
        top: report.slice(0, 40),
      },
      null,
      2
    )
  );

  const remaining = report.filter((r) =>
    FIX
      ? r.remainingReplacement + r.remainingMojibake > 0
      : r.replacement + r.mojibake > 0 || r.hasBom
  );

  // --ci: bloqueia mojibake e BOM. --strict: tambem bloqueia U+FFFD.
  const blockers = remaining.filter((r) => {
    if (FIX) {
      if (r.remainingMojibake > 0) return true;
      return STRICT && r.remainingReplacement > 0;
    }
    if (r.mojibake > 0 || r.hasBom) return true;
    return STRICT && r.replacement > 0;
  });

  if (CI && blockers.length > 0) {
    console.error(
      `[encoding] ${blockers.length} ficheiro(s) com acentuacao partida / BOM. Ver src/core/rules/linguagem-portuguesa.md`
    );
    process.exit(1);
  }
}

main();
