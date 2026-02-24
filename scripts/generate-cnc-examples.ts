/**
 * Gera exemplos reais de arquivos TCN e KDT (19mm e 10mm) para validação na máquina.
 * Executar: npx tsx scripts/generate-cnc-examples.ts
 */

import { runCutLayout, cutlistToPieces } from "../src/core/cutlayout/cutLayoutEngine";
import { exportCncFiles } from "../src/core/cnc/cncExport";
import { writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = join(__dirname, "cnc-output");
const PROJECT_NAME = "job_exemplo";
const OUT_DIR = join(OUT_ROOT, PROJECT_NAME);

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Layout simples: 2 peças 19mm + 2 peças 10mm (cutlist → pieces → layout)
  const cutlistItems = [
    {
      dimensoes: { largura: 600, altura: 400, profundidade: 19 },
      espessura: 19,
      quantidade: 1,
      boxId: "exemplo-19",
      nome: "Fundo 19mm",
    },
    {
      dimensoes: { largura: 500, altura: 300, profundidade: 19 },
      espessura: 19,
      quantidade: 1,
      boxId: "exemplo-19",
      nome: "Tampa 19mm",
    },
    {
      dimensoes: { largura: 300, altura: 200, profundidade: 10 },
      espessura: 10,
      quantidade: 1,
      boxId: "exemplo-10",
      nome: "Fundo 10mm",
    },
    {
      dimensoes: { largura: 250, altura: 150, profundidade: 10 },
      espessura: 10,
      quantidade: 1,
      boxId: "exemplo-10",
      nome: "Divisor 10mm",
    },
  ];

  const pieces = cutlistToPieces(cutlistItems);
  const layoutResult = runCutLayout(pieces, {
    largura_mm: 2750,
    altura_mm: 1830,
    espessura_mm: 19,
  });

  const cnc = exportCncFiles({ projectName: PROJECT_NAME }, layoutResult, []);

  for (const file of cnc.files) {
    const base = file.filenameBase;
    const tcnPath = join(OUT_DIR, `${base}.tcn`);
    const kdtPath = join(OUT_DIR, `${base}.kdt`);
    await writeFile(tcnPath, file.tcn, "utf8");
    await writeFile(kdtPath, file.kdt, "utf8");
    console.log("Gerado:", tcnPath, kdtPath);
  }

  console.log("\nConcluído. Ficheiros em:", OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
