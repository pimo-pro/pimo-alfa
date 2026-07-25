import fs from "node:fs";

const f = "src/pages/documentacao/HubDocumentacaoInterna.tsx";
const t = fs.readFileSync(f, "utf8");
console.log("FFFD count", (t.match(/\uFFFD/g) || []).length);
console.log("Documentação via code", t.includes("Documenta" + "\u00e7\u00e3o"));
console.log("maxWidth none", t.includes('maxWidth: "none"'));
console.log("1120", t.includes("1120"));
const i = t.indexOf("Hub de ");
console.log("snippet", JSON.stringify(t.slice(i, i + 40)));
const j = t.indexOf("\uFFFD");
if (j >= 0) console.log("fffd context", JSON.stringify(t.slice(j - 20, j + 20)));
