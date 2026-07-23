import { useCallback } from "react";
import { useProject } from "../context/useProject";
import { useMaterials } from "./useMaterials";
import { useComponentTypes } from "./useComponentTypes";
import { useFerragens } from "./useFerragens";
import { useAuth } from "../auth/useAuth";
import { hasFullAccess } from "../auth/rbac";
import { canShowSectionPrices } from "../admin/industrialSectionsConfig";
import { buildResumoFinanceiroPdf, resumoFinanceiroPdfFileName } from "../core/pdf/pdfResumoFinanceiro";
import { buildPecasTotaisPdf, pecasTotaisPdfFileName } from "../core/pdf/pdfPecasTotais";
import { buildFerragensTotaisPdf, ferragensTotaisPdfFileName } from "../core/pdf/pdfFerragensTotais";
import { buildTotaisProjetoPdf, totaisProjetoPdfFileName } from "../core/pdf/pdfTotaisProjeto";
import { useCutlistData } from "./useCutlistData";
import {
  beginIndustrialFileGeneration,
  endIndustrialFileGeneration,
} from "../core/fabrication/industrialGenerationSuspend";
import { ensureLogoIndustrialLoaded } from "../core/pdf/logoIndustrialPublic";
import { applyResultados } from "../context/projectState";
import type { ProjectState } from "../context/projectTypes";
import { resolveIndustrialZipPdf } from "../core/industrial/onlineAnalysis/resolveIndustrialZipPdf";
import type { IndustrialPdfDoc } from "../core/industrial/onlineAnalysis/resolveIndustrialZipPdf";
import { buildClassicIndustrialPdf } from "../core/industrial/onlineAnalysis/buildClassicIndustrialPdf";
import { industrialArmazemPdfFileName } from "../core/pdf/pdfIndustrialArmazem";

export function useIndustrialBottomPdf() {
  const { project } = useProject();
  const { materials } = useMaterials();
  const { componentTypes } = useComponentTypes();
  const { ferragens } = useFerragens();
  const { hasPermission } = useAuth();
  const isAdmin = hasFullAccess(hasPermission);
  const cutlistData = useCutlistData();

  const projectName = project.projectName?.trim() || "Projeto";
  const boxes = project.boxes ?? [];
  const fullProject = () => applyResultados(project as ProjectState);

  const saveResolvedPdf = useCallback(
    async (
      docId:
        | "resumo_financeiro"
        | "pecas_totais"
        | "ferragens_totais"
        | "totais_projeto"
        | "industrial_armazem",
      fileName: string,
      classic: () => IndustrialPdfDoc | Promise<IndustrialPdfDoc>
    ) => {
      beginIndustrialFileGeneration();
      try {
        await ensureLogoIndustrialLoaded();
        const doc = await resolveIndustrialZipPdf(fullProject(), docId, classic);
        doc.save(fileName);
      } finally {
        endIndustrialFileGeneration();
      }
    },
    [project]
  );

  const buildFerragensTotaisDoc = useCallback(() => {
    return buildFerragensTotaisPdf(
      {
        boxes,
        rules: project.rules,
        materialId: project.materialId,
        projectName,
        remates: project.remates,
        rodapes: project.rodapes,
        extractedPartsByBoxId: project.extractedPartsByBoxId,
        pieceObservacoes: project.pieceObservacoes,
        ferragemOrla: project.ferragemOrla,
        orlaPresets: project.orlaPresets,
      },
      componentTypes,
      ferragens,
      materials
    );
  }, [boxes, project, projectName, componentTypes, ferragens, materials]);

  const exportResumoFinanceiroPdf = useCallback(async () => {
    await saveResolvedPdf("resumo_financeiro", resumoFinanceiroPdfFileName(projectName), () =>
      buildResumoFinanceiroPdf(
        {
          boxes,
          rules: project.rules,
          materialId: project.materialId,
          projectName,
          remates: project.remates,
          rodapes: project.rodapes,
          extractedPartsByBoxId: project.extractedPartsByBoxId,
          industrialPieceEdits: project.industrialPieceEdits,
        },
        materials,
        canShowSectionPrices("resumoFinanceiro", isAdmin)
      )
    );
  }, [boxes, project, projectName, materials, isAdmin, saveResolvedPdf]);

  const exportPecasTotaisPdf = useCallback(async () => {
    await saveResolvedPdf("pecas_totais", pecasTotaisPdfFileName(projectName), () =>
      buildPecasTotaisPdf(
        {
          boxes,
          rules: project.rules,
          materialId: project.materialId,
          projectName,
          remates: project.remates,
          rodapes: project.rodapes,
          extractedPartsByBoxId: project.extractedPartsByBoxId,
          industrialPieceEdits: project.industrialPieceEdits,
        },
        materials
      )
    );
  }, [boxes, project, projectName, materials, saveResolvedPdf]);

  const exportFerragensTotaisPdf = useCallback(async () => {
    await saveResolvedPdf("ferragens_totais", ferragensTotaisPdfFileName(projectName), () =>
      buildFerragensTotaisDoc()
    );
  }, [buildFerragensTotaisDoc, projectName, saveResolvedPdf]);

  const viewFerragensTotaisPdf = useCallback(async () => {
    beginIndustrialFileGeneration();
    try {
      await ensureLogoIndustrialLoaded();
      const doc = await resolveIndustrialZipPdf(
        fullProject(),
        "ferragens_totais",
        () => buildFerragensTotaisDoc()
      );
      const out = doc.output("arraybuffer");
      const bytes = out instanceof ArrayBuffer ? new Uint8Array(out) : new Uint8Array(out);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      endIndustrialFileGeneration();
    }
  }, [buildFerragensTotaisDoc, project]);

  const exportTotaisProjetoPdf = useCallback(async () => {
    await saveResolvedPdf("totais_projeto", totaisProjetoPdfFileName(projectName), () =>
      buildTotaisProjetoPdf(
        {
          boxes,
          rules: project.rules,
          materialId: project.materialId,
          projectName,
          remates: project.remates,
          rodapes: project.rodapes,
          extractedPartsByBoxId: project.extractedPartsByBoxId,
          industrialPieceEdits: project.industrialPieceEdits,
        },
        materials,
        canShowSectionPrices("totaisProjeto", isAdmin),
        {
          totalOrlaMetros: cutlistData.totalOrlaMetros,
          custoTotalOrla: cutlistData.custoTotalOrla,
          custoTotalRemates: cutlistData.custoTotalRemates,
          custoTotalPaineis: cutlistData.custoTotalPaineis,
          custoTotalPortas: cutlistData.custoTotalPortas,
          custoTotalGavetas: cutlistData.custoTotalGavetas,
          custoTotalFerragens: cutlistData.custoTotalFerragens,
          custoTotal: cutlistData.custoTotal,
        }
      )
    );
  }, [boxes, project, projectName, materials, isAdmin, cutlistData, saveResolvedPdf]);

  /** Hub armazem — sempre via resolve + classic (P3.2). */
  const exportIndustrialArmazemPdf = useCallback(async () => {
    const full = fullProject();
    await saveResolvedPdf(
      "industrial_armazem",
      industrialArmazemPdfFileName(projectName),
      () => buildClassicIndustrialPdf(full, "industrial_armazem")
    );
  }, [project, projectName, saveResolvedPdf]);

  return {
    exportResumoFinanceiroPdf,
    exportPecasTotaisPdf,
    exportFerragensTotaisPdf,
    viewFerragensTotaisPdf,
    exportTotaisProjetoPdf,
    exportIndustrialArmazemPdf,
    isAdmin,
  };
}
