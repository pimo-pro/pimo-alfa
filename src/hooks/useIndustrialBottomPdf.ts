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
      docId: "resumo_financeiro" | "pecas_totais" | "ferragens_totais" | "totais_projeto",
      fileName: string,
      classic: () => { save: (name: string) => void; output: (type: string) => ArrayBuffer | Uint8Array }
    ) => {
      beginIndustrialFileGeneration();
      try {
        await ensureLogoIndustrialLoaded();
        const doc = await resolveIndustrialZipPdf(fullProject(), docId, classic);
        (doc as { save: (name: string) => void }).save(fileName);
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
        boxes,
        project.rules,
        project.materialId,
        projectName,
        materials,
        canShowSectionPrices("resumoFinanceiro", isAdmin)
      )
    );
  }, [boxes, project.rules, project.materialId, projectName, materials, isAdmin, saveResolvedPdf]);

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
      const blob = (doc as { output: (t: string) => Blob }).output("blob");
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
      )
    );
  }, [boxes, project, projectName, materials, isAdmin, cutlistData, saveResolvedPdf]);

  return {
    exportResumoFinanceiroPdf,
    exportPecasTotaisPdf,
    exportFerragensTotaisPdf,
    viewFerragensTotaisPdf,
    exportTotaisProjetoPdf,
    isAdmin,
  };
}
