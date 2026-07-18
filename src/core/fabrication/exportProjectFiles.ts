/**
 * Catalogo de ficheiros exportados do projeto.
 * Reexporta a lista oficial de PDFs (inclui ferragens_totais + industrial_armazem).
 */

export {
  buildProjectPdfList,
  projectPdfListIncludesFerragensTotais,
  type ProjectPdfListEntry,
} from "./buildProjectPdfList";

import { buildProjectPdfList } from "./buildProjectPdfList";

/** Nomes de ficheiro PDF a incluir no download/ZIP do projeto. */
export function exportProjectPdfFileNames(projectName: string): string[] {
  return buildProjectPdfList(projectName).map((e) => e.fileName);
}

/** Garante que o PDF oficial de ferragens totais esta na exportacao. */
export function assertFerragensTotaisInExport(projectName: string): string {
  const entry = buildProjectPdfList(projectName).find((e) => e.id === "ferragens-totais");
  if (!entry) {
    throw new Error("ferragens_totais.pdf em falta na lista de exportacao do projeto.");
  }
  return entry.fileName;
}
