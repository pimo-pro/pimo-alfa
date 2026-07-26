import fs from "node:fs";
import path from "node:path";

const ROOTS = [
  "src/core/docs/archive",
  "src/core/docs/refs",
  "src/core/docs/progresso",
  "public/updates",
];

const MOJIBAKE_MARKERS = [
  "├",
  "Ã",
  "Â",
  "�",
  "ï»¿", // BOM as latin1
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|json|mjs|bak|md)$/i.test(name)) out.push(p);
  }
  return out;
}

function hasBom(buf) {
  return buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
}

function looksMojibake(text) {
  return MOJIBAKE_MARKERS.some((m) => text.includes(m));
}

/** Fix classic UTF-8 interpreted as Windows-1252/Latin1 mojibake. */
function fixMojibake(text) {
  // If we see typical double-encoding patterns, try latin1->utf8 roundtrip
  if (!/Ã.|Â.|├.|�/.test(text)) return text;
  try {
    const repaired = Buffer.from(text, "latin1").toString("utf8");
    // Only accept if repair reduces mojibake markers and keeps printable PT chars
    const before = (text.match(/Ã.|Â.|├./g) || []).length;
    const after = (repaired.match(/Ã.|Â.|├./g) || []).length;
    if (after < before && !repaired.includes("\uFFFD")) return repaired;
  } catch {
    /* keep original */
  }
  return text;
}

const report = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const buf = fs.readFileSync(file);
    const bom = hasBom(buf);
    let text = buf.toString("utf8");
    const beforeSample = text.slice(0, 200);
    const hadMojibake = looksMojibake(text);
    let next = hadMojibake ? fixMojibake(text) : text;
    // strip BOM from string content if present
    if (next.charCodeAt(0) === 0xfeff) next = next.slice(1);

    const changed = bom || next !== text;
    if (changed) {
      fs.writeFileSync(file, next, { encoding: "utf8" }); // no BOM
      report.push({
        file,
        bom,
        mojibake: hadMojibake,
        before: beforeSample.replace(/\s+/g, " ").slice(0, 80),
        after: next.slice(0, 200).replace(/\s+/g, " ").slice(0, 80),
      });
    }
  }
}

console.log(JSON.stringify({ fixed: report.length, files: report }, null, 2));
