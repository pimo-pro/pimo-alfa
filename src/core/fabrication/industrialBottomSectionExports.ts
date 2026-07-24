import type { ProjectState } from "../../context/projectTypes";
import type { MaterialIndustrial } from "../manufacturing/materials";
import type { ComponentType } from "../components/componentTypes";
import type { Ferragem } from "../ferragens/ferragens";
import { buildResumoFinanceiroPdf, resumoFinanceiroPdfFileName } from "../pdf/pdfResumoFinanceiro";
import { buildPecasTotaisPdf, pecasTotaisPdfFileName } from "../pdf/pdfPecasTotais";
import { buildFerragensTotaisPdf, ferragensTotaisPdfFileName } from "../pdf/pdfFerragensTotais";
import { totaisProjetoPdfFileName } from "../pdf/pdfTotaisProjeto";
import { ensureLogoIndustrialLoaded } from "../pdf/logoIndustrialPublic";

export type BottomSectionPdfBundle = {
  resumoFinanceiro: ReturnType<typeof buildResumoFinanceiroPdf>;
  pecasTotais: ReturnType<typeof buildPecasTotaisPdf>;
  ferragensTotais: ReturnType<typeof buildFerragensTotaisPdf>;
  /** P3.5 — alias do resumo financeiro unificado (compat ZIP). */
  totaisProjeto: ReturnType<typeof buildResumoFinanceiroPdf>;
  fileNames: {
    resumoFinanceiro: string;
    pecasTotais: string;
    ferragensTotais: string;
    totaisProjeto: string;
  };
};

export async function buildBottomSectionPdfs(input: {
  project: Pick<
    ProjectState,
    | "boxes"
    | "rules"
    | "materialId"
    | "projectName"
    | "remates"
    | "rodapes"
    | "extractedPartsByBoxId"
    | "pieceObservacoes"
    | "ferragemOrla"
    | "orlaPresets"
    | "orlaPieces"
    | "financeiroOverrides"
    | "financeiroAdminSettings"
  > & { industrialPieceEdits?: import("../industrial/industrialPieceEditsTypes").IndustrialPieceEditsStore };
  materials: MaterialIndustrial[];
  componentTypes: ComponentType[];
  ferragens: Ferragem[];
  showPrices: boolean;
}): Promise<BottomSectionPdfBundle> {
  await ensureLogoIndustrialLoaded();
  const projectName = input.project.projectName?.trim() || "Projeto";

  // P3.5 — um único PDF financeiro SSOT; totais_projeto.pdf = mesmo conteúdo.
  const financeiroPdf = buildResumoFinanceiroPdf(
    input.project,
    input.materials,
    input.showPrices
  );

  return {
    resumoFinanceiro: financeiroPdf,
    pecasTotais: buildPecasTotaisPdf(input.project, input.materials),
    ferragensTotais: buildFerragensTotaisPdf(
      input.project,
      input.componentTypes,
      input.ferragens,
      input.materials
    ),
    totaisProjeto: financeiroPdf,
    fileNames: {
      resumoFinanceiro: resumoFinanceiroPdfFileName(projectName),
      pecasTotais: pecasTotaisPdfFileName(projectName),
      ferragensTotais: ferragensTotaisPdfFileName(projectName),
      totaisProjeto: totaisProjetoPdfFileName(projectName),
    },
  };
}
