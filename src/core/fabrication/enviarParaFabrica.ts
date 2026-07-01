/**
 * Valida artefactos, prepara payload e envia ordem industrial ao PIMO TRAK.
 */

import type { ProjectState } from "../../context/projectTypes";
import type { CutListItemComPreco } from "../types";
import type { MaterialIndustrial } from "../manufacturing/materials";
import {
  INDUSTRIAL_REQUIRED_ARTIFACT_KINDS,
  type IndustrialRequiredArtifactKind,
} from "../industrial/industrialOutputGuard";
import { ferragensTotaisPdfFileName } from "../pdf/pdfFerragensTotais";
import { pecasTotaisPdfFileName } from "../pdf/pdfPecasTotais";
import { resumoFinanceiroPdfFileName } from "../pdf/pdfResumoFinanceiro";
import { totaisProjetoPdfFileName } from "../pdf/pdfTotaisProjeto";
import { consumoMateriaisPdfFileName } from "../pdf/pdfConsumoMateriais";
import { chapasRealPdfFileName } from "../pdf/pdfChapasReal";
import { industrialFerragensPdfFileName, industrialFerragensXlsxFileName } from "./industrialProjectArtifacts";
import { buildCutlistItemsForIndustrialExport } from "./buildCutlistItemsForIndustrialExport";
import {
  buildEnviarParaFabricaPayload,
  type EnviarParaFabricaPayload,
} from "../industrial/IndustrialPieceEditsService";
import { submitIndustrialOrder, type IndustrialOrderSubmitResult } from "../industrial/industrialOrdersApi";
import { getCurrentProjectUser } from "../projects/currentUser";

export type { EnviarParaFabricaPayload };

export type EnviarParaFabricaValidation = {
  ok: boolean;
  missing: string[];
  projectName: string;
  payload?: EnviarParaFabricaPayload;
};

export type EnviarParaFabricaSubmitResult = EnviarParaFabricaValidation & {
  submit?: IndustrialOrderSubmitResult;
};

const BOTTOM_SECTION_PDFS = [
  resumoFinanceiroPdfFileName,
  pecasTotaisPdfFileName,
  ferragensTotaisPdfFileName,
  totaisProjetoPdfFileName,
  consumoMateriaisPdfFileName,
  chapasRealPdfFileName,
] as const;

type IndustrialProjectSlice = Pick<
  ProjectState,
  | "projectName"
  | "currentProjectId"
  | "boxes"
  | "rules"
  | "materialId"
  | "remates"
  | "rodapes"
  | "extractedPartsByBoxId"
  | "pieceObservacoes"
  | "industrialPieceEdits"
  | "industrialOperacoes"
>;

export function buildIndustrialOrderPayload(
  project: IndustrialProjectSlice,
  materials: MaterialIndustrial[] = []
): EnviarParaFabricaPayload {
  const items: CutListItemComPreco[] = buildCutlistItemsForIndustrialExport({
    boxes: project.boxes ?? [],
    rules: project.rules,
    materialId: project.materialId,
    projectName: project.projectName,
    remates: project.remates ?? [],
    rodapes: project.rodapes ?? [],
    extractedPartsByBoxId: project.extractedPartsByBoxId,
    industrialPieceEdits: project.industrialPieceEdits,
  });
  return buildEnviarParaFabricaPayload(project, items, materials);
}

/**
 * Valida artefactos industriais e prepara payload para envio ao PIMO TRAK.
 */
export function enviarParaFabrica(
  project: IndustrialProjectSlice,
  generatedZipPaths: string[],
  materials: MaterialIndustrial[] = []
): EnviarParaFabricaValidation {
  const slug = project.projectName?.trim() || "Projeto";
  const expected = [
    resumoFinanceiroPdfFileName(slug),
    pecasTotaisPdfFileName(slug),
    ferragensTotaisPdfFileName(slug),
    totaisProjetoPdfFileName(slug),
    consumoMateriaisPdfFileName(slug),
    chapasRealPdfFileName(slug),
    industrialFerragensPdfFileName(slug),
    industrialFerragensXlsxFileName(slug),
  ];

  const pathSet = new Set(generatedZipPaths.map((p) => p.split("/").pop() ?? p));
  const missing = expected.filter((name) => !pathSet.has(name));

  const requiredKinds: IndustrialRequiredArtifactKind[] = [...INDUSTRIAL_REQUIRED_ARTIFACT_KINDS];
  for (const kind of requiredKinds) {
    if (kind === "pdf-ferragens-industriais" && !pathSet.has(industrialFerragensPdfFileName(slug))) {
      if (!missing.includes(industrialFerragensPdfFileName(slug))) {
        missing.push(industrialFerragensPdfFileName(slug));
      }
    }
    if (kind === "xlsx-ferragens-industriais" && !pathSet.has(industrialFerragensXlsxFileName(slug))) {
      if (!missing.includes(industrialFerragensXlsxFileName(slug))) {
        missing.push(industrialFerragensXlsxFileName(slug));
      }
    }
  }

  for (const fn of BOTTOM_SECTION_PDFS) {
    const name = fn(slug);
    if (!pathSet.has(name) && !missing.includes(name)) missing.push(name);
  }

  const payload = buildIndustrialOrderPayload(project, materials);

  return {
    ok: missing.length === 0,
    missing,
    projectName: slug,
    payload,
  };
}

/** Envia ordem industrial ao PIMO TRAK (POST /api/industrial/orders). */
export async function submitEnviarParaFabrica(
  project: IndustrialProjectSlice,
  materials: MaterialIndustrial[] = [],
  options?: { skipArtifactValidation?: boolean; generatedZipPaths?: string[] }
): Promise<EnviarParaFabricaSubmitResult> {
  const paths = options?.generatedZipPaths ?? [];
  const validation =
    options?.skipArtifactValidation === true
      ? {
          ok: true,
          missing: [] as string[],
          projectName: project.projectName?.trim() || "Projeto",
          payload: buildIndustrialOrderPayload(project, materials),
        }
      : enviarParaFabrica(project, paths, materials);

  if (!validation.payload) {
    return { ...validation, submit: { ok: false, error: "Payload inválido" } };
  }

  const user = getCurrentProjectUser();
  const submit = await submitIndustrialOrder({
    ...validation.payload,
    ownerId: user.ownerId,
    ownerName: user.ownerName,
  });

  return { ...validation, submit };
}

/** @deprecated Use enviarParaFabrica(project, paths) */
export function enviarParaFabricaFromPaths(
  projectName: string,
  generatedZipPaths: string[]
): EnviarParaFabricaValidation {
  return enviarParaFabrica(
    {
      projectName,
      boxes: [],
      rules: {} as ProjectState["rules"],
      remates: [],
      rodapes: [],
      extractedPartsByBoxId: {},
      pieceObservacoes: {},
      industrialPieceEdits: {},
      industrialOperacoes: {},
    },
    generatedZipPaths
  );
}
