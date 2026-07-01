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

  const savePdf = useCallback((doc: { save: (name: string) => void }, fileName: string) => {
    beginIndustrialFileGeneration();
    try {
      doc.save(fileName);
    } finally {
      endIndustrialFileGeneration();
    }
  }, []);

  const exportResumoFinanceiroPdf = useCallback(() => {
    const doc = buildResumoFinanceiroPdf(
      boxes,
      project.rules,
      project.materialId,
      projectName,
      materials,
      canShowSectionPrices("resumoFinanceiro", isAdmin)
    );
    savePdf(doc, resumoFinanceiroPdfFileName(projectName));
  }, [boxes, project.rules, project.materialId, projectName, materials, isAdmin, savePdf]);

  const exportPecasTotaisPdf = useCallback(() => {
    const doc = buildPecasTotaisPdf(
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
    );
    savePdf(doc, pecasTotaisPdfFileName(projectName));
  }, [boxes, project, projectName, materials, savePdf]);

  const exportFerragensTotaisPdf = useCallback(() => {
    const doc = buildFerragensTotaisPdf(
      {
        boxes,
        rules: project.rules,
        materialId: project.materialId,
        projectName,
        remates: project.remates,
        rodapes: project.rodapes,
        extractedPartsByBoxId: project.extractedPartsByBoxId,
        pieceObservacoes: project.pieceObservacoes,
      },
      componentTypes,
      ferragens
    );
    savePdf(doc, ferragensTotaisPdfFileName(projectName));
  }, [boxes, project, projectName, componentTypes, ferragens, savePdf]);

  const exportTotaisProjetoPdf = useCallback(() => {
    const doc = buildTotaisProjetoPdf(
      boxes,
      project.rules,
      project.materialId,
      projectName,
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
    );
    savePdf(doc, totaisProjetoPdfFileName(projectName));
  }, [boxes, project, projectName, materials, isAdmin, cutlistData, savePdf]);

  return {
    exportResumoFinanceiroPdf,
    exportPecasTotaisPdf,
    exportFerragensTotaisPdf,
    exportTotaisProjetoPdf,
    isAdmin,
  };
}
