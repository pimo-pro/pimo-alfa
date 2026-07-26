/** Passo final: separadores tipográficos com U+FFFD restantes. */
import fs from "node:fs";
import path from "node:path";

const F = "\uFFFD";
const SKIP = new Set(["node_modules", "dist", ".git", "coverage", "tmp", "industrial"]);
const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md"]);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    const norm = full.replace(/\\/g, "/");
    if (norm.includes("/industrial/")) continue;
    if (ent.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(ent.name))) out.push(full);
  }
  return out;
}

const pairs = [
  ["}" + F + "{", "}\u2013{"],
  ["2" + F + "{", "2\u00D7{"],
  [" " + F + '{"', " \u00D7{\""],
  ["pe\u00E7as " + F + '{"', "pe\u00E7as \u2014{\""],
  ["contornos " + F + '{"', "contornos \u2014{\""],
  ["ficheiros " + F + '{"', "ficheiros \u2014{\""],
  ["aberturas " + F + '{"', "aberturas \u2014{\""],
  ["status} " + F + '{"', "status} \u2014{\""],
  ["m\u00F3dulos " + F + '{"', "m\u00F3dulos \u2014{\""],
  ['? "' + F + '"', '? "\u2026"'],
  ['"' + F + '" : " (conclu', '"\u2026" : " (conclu'],
  ["N " + F + " ", "N \u2013 "],
  ["M " + F + " ", "M \u2013 "],
  ["K " + F + " ", "K \u2013 "],
  ["F " + F + " ", "F \u2013 "],
  ["H " + F + " ", "H \u2013 "],
  ["D " + F + " ", "D \u2013 "],
  ["C " + F + " ", "C \u2013 "],
];

let changed = 0;
for (const file of walk("src")) {
  let t = fs.readFileSync(file, "utf8");
  if (!t.includes(F)) continue;
  let next = t;
  for (const [a, b] of pairs) {
    if (next.includes(a)) next = next.split(a).join(b);
  }
  next = next.split(" " + F + '{"').join(" \u2014{\"");
  next = next.split("}" + F).join("}\u2013");
  next = next.split(F + "{").join("\u2013{");
  if (next !== t) {
    fs.writeFileSync(file, next, "utf8");
    changed++;
  }
}

for (const f of [
  "src/core/drawers/european/ui/EuropeanDrawerConfigPanel.tsx",
  "src/components/admin/DrawersAdminHubPage.tsx",
]) {
  const t = fs.readFileSync(f, "utf8");
  const n = (t.match(/\uFFFD/g) || []).length;
  console.log(f, "fffd=", n);
  if (n) {
    t.split(/\n/).forEach((l, i) => {
      if (l.includes(F)) console.log(" ", i + 1, l.trim().slice(0, 110));
    });
  }
}
console.log("filesChanged", changed);

// count drawers+admin remaining
let rem = 0;
for (const file of [...walk("src/core/drawers"), ...walk("src/components/admin")]) {
  rem += (fs.readFileSync(file, "utf8").match(/\uFFFD/g) || []).length;
}
console.log("drawers+admin remaining FFFD", rem);
