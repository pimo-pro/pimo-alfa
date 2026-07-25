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

let bad = 0;
for (const f of [...walk("src/core/docs/pimoSoon"), "src/pages/documentacao/HubPimoSoonContent.tsx"]) {
  if (fs.readFileSync(f, "utf8").includes("\uFFFD")) {
    console.log("FFFD", f);
    bad++;
  }
}
console.log("bad", bad);

const fases = fs.readFileSync("src/core/docs/pimoSoon/pimoSoonFases.ts", "utf8");
console.log("fase13", fases.includes("Fase 13"));
console.log("fase18", fases.includes("Fase 18"));
console.log("items count approx", (fases.match(/id: "f\d+-/g) || []).length);

const s = fs.readFileSync("src/pages/documentacao/hubSections.ts", "utf8");
console.log("DEFAULT progresso", /DEFAULT_HUB_SECTION:\s*HubSectionId\s*=\s*"progresso"/.test(s));
console.log("id pimo-soon", s.includes('id: "pimo-soon"'));

const hub = fs.readFileSync("src/pages/documentacao/HubDocumentacaoInterna.tsx", "utf8");
console.log("hub branch", hub.includes('active === "pimo-soon"'));
console.log("hub import", hub.includes("HubPimoSoonContent"));

const notas = fs.readFileSync("src/core/docs/pimoSoon/pimoSoonNotas.ts", "utf8");
console.log("notas", (notas.match(/id: "note-/g) || []).length);
