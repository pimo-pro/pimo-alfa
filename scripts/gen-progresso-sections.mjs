import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const srcPath = path.join(os.tmpdir(), "ProjectProgress_recover.tsx");
const outDir = "src/core/docs/progresso";
const outPath = path.join(outDir, "progressoSections.ts");

const src = fs.readFileSync(srcPath, "utf8");
const start = src.indexOf("const PROJECT_SECTIONS = [");
const endMarker = "\n];";
const end = src.indexOf(endMarker, start);
if (start < 0 || end < 0) {
  console.error("PROJECT_SECTIONS not found", start, end);
  process.exit(1);
}
let body = src.slice(start, end + endMarker.length);
body = body.replace(
  "const PROJECT_SECTIONS = [",
  "export const PROGRESSO_SECTIONS: ProgressoSection[] = ["
);
body = body.replace(/ as const/g, "");

const header = `/**
 * Secoes de progresso migradas do antigo ProjectProgress.tsx (Fase 9).
 * Conteudo 1:1 — sem reescrita.
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

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, header + body + "\n", "utf8");
const ids = (body.match(/id: "/g) || []).length;
console.log("ok sections~", ids, "sample", body.slice(40, 100));
