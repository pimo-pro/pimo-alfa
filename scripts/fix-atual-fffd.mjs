import fs from "node:fs";

const mid = "\u00b7";
const files = [
  "src/core/docs/atual/atualSnapshot.ts",
  "src/core/docs/atual/atualTypes.ts",
  "src/pages/documentacao/HubAtualContent.tsx",
];

for (const f of files) {
  let t = fs.readFileSync(f, "utf8");
  t = t.replace(/Altera\uFFFD\uFFFDes/g, "Altera\u00e7\u00f5es");
  t = t.replace(/\uFFFD/g, mid);
  fs.writeFileSync(f, t, "utf8");
  console.log(f, "FFFD=" + fs.readFileSync(f, "utf8").includes("\uFFFD"));
}

const hub = fs.readFileSync("src/pages/documentacao/HubDocumentacaoInterna.tsx", "utf8");
const atual = fs.readFileSync("src/pages/documentacao/HubAtualContent.tsx", "utf8");
console.log("hub atual branch", hub.includes('active === "atual"'));
console.log("HubAtualContent import", hub.includes("HubAtualContent"));
console.log("ReactNode", atual.includes("ReactNode"));
console.log("loadHubAtual", atual.includes("loadHubAtual"));
console.log("297.871 via stats", fs.readFileSync("src/core/docs/atual/atualSnapshot.ts", "utf8").includes("loadHubStats"));
