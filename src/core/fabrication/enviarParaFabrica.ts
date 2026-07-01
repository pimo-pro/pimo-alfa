/**
 * Placeholder — valida artefactos e prepara payload para PIMO TRAK.
 */

import type { ProjectState } from "../../context/projectTypes";
import type { CutListItemComPreco } from "../types";
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

export type { EnviarParaFabricaPayload };

export type EnviarParaFabricaValidation = {
  ok: boolean;
  missing: string[];
  projectName: string;
  payload?: EnviarParaFabricaPayload;
};

const BOTTOM_SECTION_PDFS = [
  resumoFinanceiroPdfFileName,
  pecasTotaisPdfFileName,
  ferragensTotaisPdfFileName,
  totaisProjetoPdfFileName,
  consumoMateriaisPdfFileName,
  chapasRealPdfFileName,
] as const;

/**
 * Valida artefactos industriais e prepara payload para envio futuro ao PIMO TRAK.
 */
export function enviarParaFabrica(
  project: Pick<
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
  >,
  generatedZipPaths: string[]
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

  const payload = buildEnviarParaFabricaPayload(project, items);

  return {
    ok: missing.length === 0,
    missing,
    projectName: slug,
    payload,
  };
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
    },
    generatedZipPaths
  );
}
