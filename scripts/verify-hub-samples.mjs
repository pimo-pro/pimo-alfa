import fs from "node:fs";

const title = "Especifica\u00e7\u00f5es T\u00e9cnicas";
const note = fs.readFileSync("src/core/docs/refs/refsNotes.ts", "utf8");
const docs = fs.readFileSync("src/core/docs/archive/historicoDocs.ts", "utf8");
console.log("note has title", note.includes(title));
console.log("docs has title", docs.includes(title));

const rem = JSON.parse(fs.readFileSync("public/updates/removed.json", "utf8"));
console.log("removed titles:");
for (const r of rem) console.log(" -", r.title);

const hub = fs.readFileSync("src/pages/documentacao/HubDocumentacaoInterna.tsx", "utf8");
console.log("width100 count", (hub.match(/width: "100%"/g) || []).length);
console.log("maxWidth none count", (hub.match(/maxWidth: "none"/g) || []).length);
console.log("media 820", hub.includes("max-width: 820px"));
console.log("margin 0", hub.includes("margin: 0"));
console.log("FFFD hub", hub.includes("\uFFFD"));

const beforeAfter = {
  before: "Documenta\uFFFD\uFFFDo / Seco / Referncias / Concludo / Pgina",
  after: [
    "Documenta\u00e7\u00e3o",
    "Sec\u00e7\u00e3o",
    "Refer\u00eancias",
    "Conclu\u00eddo",
    "P\u00e1gina",
  ],
};
console.log("examples", JSON.stringify(beforeAfter, null, 2));
