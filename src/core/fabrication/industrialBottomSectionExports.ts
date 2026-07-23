import type { ProjectState } from "../../context/projectTypes";
import type { MaterialIndustrial } from "../manufacturing/materials";
import type { ComponentType } from "../components/componentTypes";
import type { Ferragem } from "../ferragens/ferragens";
import { buildResumoFinanceiroPdf, resumoFinanceiroPdfFileName } from "../pdf/pdfResumoFinanceiro";
import { buildPecasTotaisPdf, pecasTotaisPdfFileName } from "../pdf/pdfPecasTotais";
import { buildFerragensTotaisPdf, ferragensTotaisPdfFileName } from "../pdf/pdfFerragensTotais";
import { buildTotaisProjetoPdf, totaisProjetoPdfFileName, type TotaisProjetoPdfExtras } from "../pdf/pdfTotaisProjeto";
import { ensureLogoIndustrialLoaded } from "../pdf/logoIndustrialPublic";

export type BottomSectionPdfBundle = {
  resumoFinanceiro: ReturnType<typeof buildResumoFinanceiroPdf>;
  pecasTotais: ReturnType<typeof buildPecasTotaisPdf>;
  ferragensTotais: ReturnType<typeof buildFerragensTotaisPdf>;
  totaisProjeto: ReturnType<typeof buildTotaisProjetoPdf>;
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
  > & { industrialPieceEdits?: import("../industrial/industrialPieceEditsTypes").IndustrialPieceEditsStore };
  materials: MaterialIndustrial[];
  componentTypes: ComponentType[];
  ferragens: Ferragem[];
  showPrices: boolean;
  totaisExtras?: TotaisProjetoPdfExtras;
}): Promise<BottomSectionPdfBundle> {
  await ensureLogoIndustrialLoaded();
  const projectName = input.project.projectName?.trim() || "Projeto";

  return {
    resumoFinanceiro: buildResumoFinanceiroPdf(input.project, input.materials, input.showPrices),
    pecasTotais: buildPecasTotaisPdf(input.project, input.materials),
    ferragensTotais: buildFerragensTotaisPdf(
      input.project,
      input.componentTypes,
      input.ferragens,
      input.materials
    ),
    totaisProjeto: buildTotaisProjetoPdf(
      input.project,
      input.materials,
      input.showPrices,
      input.totaisExtras
    ),
    fileNames: {
      resumoFinanceiro: resumoFinanceiroPdfFileName(projectName),
      pecasTotais: pecasTotaisPdfFileName(projectName),
      ferragensTotais: ferragensTotaisPdfFileName(projectName),
      totaisProjeto: totaisProjetoPdfFileName(projectName),
    },
  };
}
