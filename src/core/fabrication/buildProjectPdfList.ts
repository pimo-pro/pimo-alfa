/**
 * Lista oficial de PDFs do projeto (exportacao / download).
 * ferragens_totais.pdf e industrial_armazem.pdf coexistem — um nao substitui o outro.
 */

import { ferragensTotaisPdfFileName } from "../pdf/pdfFerragensTotais";
import { industrialArmazemPdfFileName } from "../pdf/pdfIndustrialArmazem";
import { pecasTotaisPdfFileName } from "../pdf/pdfPecasTotais";
import { resumoFinanceiroPdfFileName } from "../pdf/pdfResumoFinanceiro";
import { totaisProjetoPdfFileName } from "../pdf/pdfTotaisProjeto";
import { industrialFerragensPdfFileName } from "./industrialProjectArtifacts";

export type ProjectPdfListEntry = {
  id: string;
  label: string;
  fileName: string;
  /** PDF de seccao BottomInfo / buildBottomSectionPdfs */
  bottomSection?: boolean;
};

/**
 * Constroi a lista de PDFs esperados no ZIP / download do projeto.
 */
export function buildProjectPdfList(projectName: string): ProjectPdfListEntry[] {
  const name = projectName?.trim() || "Projeto";
  return [
    {
      id: "resumo-financeiro",
      label: "Resumo Financeiro",
      fileName: resumoFinanceiroPdfFileName(name),
      bottomSection: true,
    },
    {
      id: "pecas-totais",
      label: "Pecas Totais",
      fileName: pecasTotaisPdfFileName(name),
      bottomSection: true,
    },
    {
      id: "ferragens-totais",
      label: "Ferragens Totais",
      fileName: ferragensTotaisPdfFileName(name),
      bottomSection: true,
    },
    {
      id: "totais-projeto",
      label: "Totais do Projeto",
      fileName: totaisProjetoPdfFileName(name),
      bottomSection: true,
    },
    {
      id: "industrial-armazem",
      label: "Industrial Armazem",
      fileName: industrialArmazemPdfFileName(name),
      bottomSection: false,
    },
    {
      id: "industrial-ferragens",
      label: "Ferragens Industriais",
      fileName: industrialFerragensPdfFileName(name),
      bottomSection: false,
    },
  ];
}

/** Confirma que ferragens_totais.pdf esta na lista (nunca substituido por industrial_armazem). */
export function projectPdfListIncludesFerragensTotais(projectName: string): boolean {
  const list = buildProjectPdfList(projectName);
  return list.some((e) => e.id === "ferragens-totais" && e.fileName.endsWith("_ferragens_totais.pdf"));
}
