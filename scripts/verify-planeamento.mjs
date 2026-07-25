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
  ...walk("src/core/docs/planeamento"),
  "src/pages/documentacao/HubPlaneamentoContent.tsx",
  "src/pages/documentacao/HubDocumentacaoInterna.tsx",
];
let bad = 0;
for (const f of files) {
  if (fs.readFileSync(f, "utf8").includes("\uFFFD")) {
    console.log("BAD", f);
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
console.log(
  "hash planeamento ok",
  fs.readFileSync("src/pages/documentacao/HubDocumentacaoInterna.tsx", "utf8").includes(
    'active === "planeamento"'
  )
);
