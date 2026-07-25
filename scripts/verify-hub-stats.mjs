import fs from "node:fs";

const files = [
  "src/pages/documentacao/HubDocumentacaoInterna.tsx",
  "src/pages/documentacao/hubSections.ts",
  "src/pages/documentacao/HubStatsContent.tsx",
  "src/pages/documentacao/loadHubStats.ts",
];

for (const f of files) {
  const buf = fs.readFileSync(f);
  const t = buf.toString("utf8");
  console.log(
    f.split(/[/\\]/).pop(),
    "FFFD=" + t.includes("\uFFFD"),
    "Doc=" + t.includes("Documenta\u00e7\u00e3o"),
    "Estat=" + (t.includes("Estat\u00edsticas") || t.includes("loadHubStats")),
    "BOM=" + (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf)
  );
}

const hub = fs.readFileSync(files[0], "utf8");
const sections = fs.readFileSync(files[1], "utf8");
const stats = fs.readFileSync(files[3], "utf8");

console.log("HubStats render", hub.includes("<HubStatsContent />"));
console.log("resolveStartSection", hub.includes("resolveStartSection"));
console.log("DEFAULT progresso", /DEFAULT_HUB_SECTION:\s*HubSectionId\s*=\s*"progresso"/.test(sections));
console.log("loc 297.871", stats.includes("297.871"));
console.log("files 2.027", stats.includes("2.027"));
console.log("delta 306,5%", stats.includes("306,5%"));
console.log("delta 324,9%", stats.includes("324,9%"));
console.log("agents 6", stats.includes('value: "6"'));
console.log("projects 0", stats.includes('id: "projects"') && stats.includes('value: "0"'));
console.log("auto-fit 220", fs.readFileSync(files[2], "utf8").includes("minmax(min(100%, 220px), 1fr)"));
console.log("mobile 820", fs.readFileSync(files[2], "utf8").includes("max-width: 820px"));
