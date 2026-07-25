import fs from "node:fs";
import path from "node:path";

function walk(d, a = []) {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) walk(p, a);
    else if (/\.(ts|tsx)$/.test(n)) a.push(p);
  }
  return a;
}

const files = [
  ...walk("src/core/docs/dashboard"),
  "src/pages/documentacao/HubDashboardContent.tsx",
  "src/pages/documentacao/hubSections.ts",
];
let bad = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  if (fs.readFileSync(f, "utf8").includes("\uFFFD")) {
    console.log("FFFD", f);
    bad++;
  }
}
console.log("badCount", bad);
console.log(
  "DEFAULT progresso",
  /DEFAULT_HUB_SECTION:\s*HubSectionId\s*=\s*"progresso"/.test(
    fs.readFileSync("src/pages/documentacao/hubSections.ts", "utf8")
  )
);
