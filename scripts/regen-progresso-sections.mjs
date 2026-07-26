import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const recoverPath = path.join("scripts", "_ProjectProgress_recover.tsx");
const raw = execSync("git show 4a5c44f:src/pages/ProjectProgress.tsx", {
  encoding: "buffer",
  maxBuffer: 10 * 1024 * 1024,
});
fs.writeFileSync(recoverPath, raw); // binary-identical from git
console.log("recovered bytes", raw.length);

const src = fs.readFileSync(recoverPath, "utf8");
const start = src.indexOf("const PROJECT_SECTIONS = [");
const m = src.slice(start).match(/\n\];\r?\n/);
if (start < 0 || !m || m.index == null) {
  console.error("parse fail", start);
  process.exit(1);
}
const end = start + m.index + m[0].length;
let body = src.slice(start, end);
body = body
  .replace(
    "const PROJECT_SECTIONS = [",
    "export const PROGRESSO_SECTIONS: ProgressoSection[] = ["
  )
  .replace(/ as const/g, "");

console.log("Funda��o", body.includes("Funda��o"));
console.log("Visualiza��o", body.includes("Visualiza��o"));
console.log("mojibake", body.includes("?�"));

const header = `/**
 * Secoes de progresso migradas do antigo ProjectProgress.tsx (Fase 9).
 * Conteudo 1:1 � sem reescrita. Gravado UTF-8 sem BOM.
 */

export type ProgressoItemStatus = "completed" | "in-progress" | "planned";

export type ProgressoSectionItem = {
  label: string;
  status: ProgressoItemStatus;
};

export type ProgressoSection = {
  id: string;
  title: string;
  description: string;
  status: ProgressoItemStatus;
  items: ProgressoSectionItem[];
};

`;

const out = path.join("src", "core", "docs", "progresso", "progressoSections.ts");
fs.writeFileSync(out, header + body.trimEnd() + "\n", { encoding: "utf8" });
console.log("wrote", out);
