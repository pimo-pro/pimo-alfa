/**
 * Pass 4: euro / math symbols and last FFFD leftovers (UTF-8 escapes only).
 * Does NOT touch src/industrial/**.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const F = "\uFFFD";
const SKIP_DIR = new Set(["node_modules", "dist", ".git", "coverage", "tmp", "industrial"]);
const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".html", ".css", ".txt"]);

/** @type {Array<[string, string]>} */
const PAIRS = [
  // mis-fixed euro
  ["\u2014/m\u00B2", "\u20AC/m\u00B2"],
  ["\u2014/min", "\u20AC/min"],
  ["\u2014/kg", "\u20AC/kg"],
  ["(\u2014)", "(\u20AC)"],
  ["1\u2014/min", "1\u20AC/min"],
  ["1 \u2014/min", "1 \u20AC/min"],
  ["Pre\u00E7o \u2014/", "Pre\u00E7o \u20AC/"],
  ["Custo \u2014/", "Custo \u20AC/"],
  ["valor \u2014/", "valor \u20AC/"],
  ["m\u00B2 \u2014 \u20AC/m\u00B2", "m\u00B2 \u00D7 \u20AC/m\u00B2"],
  ["m\u00B2 \u2014 \u2014/m\u00B2", "m\u00B2 \u00D7 \u20AC/m\u00B2"],
  ["peso \u2014 \u20AC/kg", "peso \u00D7 \u20AC/kg"],
  ["peso \u2014 \u2014/kg", "peso \u00D7 \u20AC/kg"],
  ["wasteM2 \u2014 \u20AC/m\u00B2", "wasteM2 \u00D7 \u20AC/m\u00B2"],
  ["wasteM2 \u2014 \u2014/m\u00B2", "wasteM2 \u00D7 \u20AC/m\u00B2"],
  ["desperd\u00EDcio \u2014 =", "desperd\u00EDcio \u20AC ="],
  ["percentual \u2014 custo", "percentual \u00D7 custo"],
  ["entra no \u2014.", "entra no \u20AC."],
  // remaining FFFD
  ["1" + F + ".", "1\u20AC."],
  ["(" + F + ")", "(\u20AC)"],
  ["(" + F + "/kg)", "(\u20AC/kg)"],
  ["orlas/" + F + ")", "orlas/\u20AC)"],
  ["Groove (" + F + "=0)", "Groove (\u00D8=0)"],
  ["paralelismo (" + F + "${", "paralelismo (\u00B1${"],
  ["gav_1" + F, "gav_1\u2026"],
  ["gav_1_fren\u2014", "gav_1_fren\u2026"],
  ["Op" + F + "\u00E3o", "Op\u00E7\u00E3o"],
  [".replace(/" + F + '/g, "-")', '.replace(/\\u2013/g, "-").replace(/\\u2014/g, "-")'],
];

function skip(rel) {
  const n = rel.replace(/\\/g, "/");
  return n.includes("/industrial/") || n.includes("fix-pt-encoding");
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (skip(full)) continue;
    if (ent.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

const roots = ["src", "tests", "public/updates"].filter((r) => fs.existsSync(r));
const files = roots.flatMap((r) => walk(r));
const changed = [];

for (const file of files) {
  let t = fs.readFileSync(file, "utf8");
  let next = t;
  for (const [a, b] of PAIRS) {
    if (next.includes(a)) next = next.split(a).join(b);
  }
  if (next !== t) {
    fs.writeFileSync(file, next, "utf8");
    changed.push(path.relative(ROOT, file).replace(/\\/g, "/"));
  }
}

let remain = 0;
const remainFiles = [];
for (const file of files) {
  const n = (fs.readFileSync(file, "utf8").match(/\uFFFD/g) || []).length;
  remain += n;
  if (n) remainFiles.push(path.relative(ROOT, file).replace(/\\/g, "/") + ":" + n);
}

console.log("FIXED=" + changed.length);
changed.forEach((f) => console.log(" " + f));
console.log("REMAIN_FFFD=" + remain);
remainFiles.forEach((s) => console.log(" " + s));
