/**
 * Ações de exportação (PDF cutlist, técnico, unificado, secções industriais).
 * Extraído do ProjectProvider para reduzir complexidade.
 */

import { useCallback } from "react";
import { buildCutlistPdf } from "../../core/pdf/pdfCutlist";
import { buildUnifiedPdf } from "../../core/pdf/pdfUnified";
import { getSettings } from "../../core/settings/settingsService";
import type { ProjectState } from "../projectTypes";
import { buildIndustrialFerragensForProject } from "../../core/industriais/buildIndustrialFerragensForProject";
import { buildFerragensIndustriaisPdf } from "../../core/pdf/pdfFerragensIndustriais";
import {
  industrialFerragensPdfFileName,
  industrialFerragensXlsxFileName,
} from "../../core/fabrication/industrialProjectArtifacts";
import { buildFerragensIndustriaisXlsxBuffer } from "../../core/xlsx/xlsxFerragensIndustriais";
import { listIndustrialMaterialsSnapshot } from "../../core/materials/service";
import { COMPONENT_TYPES_DEFAULT, type ComponentType } from "../../core/components/componentTypes";
import { FERRAGENS_DEFAULT, type Ferragem } from "../../core/ferragens/ferragens";
import { safeGetItem } from "../../utils/storage";
import { buildBottomSectionPdfs } from "../../core/fabrication/industrialBottomSectionExports";
import { useAuth } from "../../auth/useAuth";
import { hasFullAccess } from "../../auth/rbac";
import { canShowSectionPrices } from "../../admin/industrialSectionsConfig";

export interface UseProjectExportActionsParams {
  projectRef: React.MutableRefObject<ProjectState>;
}

const safeProjectName = (name: string): string =>
  name.replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s+/g, "_") || "projeto";

function loadExportComponentTypes(): ComponentType[] {
  const raw = safeGetItem("pimo_component_types");
  if (!raw) return COMPONENT_TYPES_DEFAULT;
  try {
    const parsed = JSON.parse(raw) as ComponentType[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : COMPONENT_TYPES_DEFAULT;
  } catch {
    return COMPONENT_TYPES_DEFAULT;
  }
}

function loadExportFerragens(): Ferragem[] {
  const raw = safeGetItem("pimo_ferragens");
  if (!raw) return FERRAGENS_DEFAULT;
  try {
    const parsed = JSON.parse(raw) as Ferragem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : FERRAGENS_DEFAULT;
  } catch {
    return FERRAGENS_DEFAULT;
  }
}

export function useProjectExportActions({ projectRef }: UseProjectExportActionsParams) {
  const { hasPermission } = useAuth();
  const isAdmin = hasFullAccess(hasPermission);

  const industrialContext = useCallback(() => {
    return {
      materials: listIndustrialMaterialsSnapshot(),
      componentTypes: loadExportComponentTypes(),
      ferragens: loadExportFerragens(),
      showPrices: canShowSectionPrices("resumoFinanceiro", isAdmin),
    };
  }, [isAdmin]);

  const exportBottomSectionPdfs = useCallback(
    async (which?: "resumoFinanceiro" | "pecasTotais" | "ferragensTotais" | "totaisProjeto") => {
      const currentProject = projectRef.current;
      const boxesToExport = currentProject.boxes ?? [];
      if (boxesToExport.length === 0) {
        alert("Nenhuma caixa no projeto. Gere o design primeiro.");
        return;
      }
      const ctx = industrialContext();
      const bottomPdfs = await buildBottomSectionPdfs({
        project: {
          projectName: currentProject.projectName,
          boxes: boxesToExport,
          rules: currentProject.rules,
          materialId: currentProject.materialId,
          extractedPartsByBoxId: currentProject.extractedPartsByBoxId ?? {},
          remates: currentProject.remates ?? [],
          rodapes: currentProject.rodapes ?? [],
          pieceObservacoes: currentProject.pieceObservacoes ?? {},
          industrialPieceEdits: currentProject.industrialPieceEdits,
          ferragemOrla: currentProject.ferragemOrla,
          orlaPresets: currentProject.orlaPresets,
        },
        materials: ctx.materials,
        componentTypes: ctx.componentTypes,
        ferragens: ctx.ferragens,
        showPrices: ctx.showPrices,
      });
      const entries: Array<[string, ReturnType<typeof buildFerragensIndustriaisPdf>]> = [
        [bottomPdfs.fileNames.resumoFinanceiro, bottomPdfs.resumoFinanceiro],
        [bottomPdfs.fileNames.pecasTotais, bottomPdfs.pecasTotais],
        [bottomPdfs.fileNames.ferragensTotais, bottomPdfs.ferragensTotais],
        [bottomPdfs.fileNames.totaisProjeto, bottomPdfs.totaisProjeto],
      ];
      const filtered = which
        ? entries.filter(([name]) => {
            if (which === "resumoFinanceiro") return name === bottomPdfs.fileNames.resumoFinanceiro;
            if (which === "pecasTotais") return name === bottomPdfs.fileNames.pecasTotais;
            if (which === "ferragensTotais") return name === bottomPdfs.fileNames.ferragensTotais;
            return name === bottomPdfs.fileNames.totaisProjeto;
          })
        : entries;
      for (const [fileName, doc] of filtered) {
        doc.save(fileName);
      }
    },
    [projectRef, industrialContext]
  );

  return {
    exportarPDF: useCallback(async () => {
      const currentProject = projectRef.current;
      const boxesToExport = currentProject.boxes ?? [];
      if (boxesToExport.length === 0) {
        alert("Nenhuma caixa no projeto. Gere o design primeiro.");
        return;
      }
      const projectName = currentProject.projectName?.trim() || "Projeto";
      const pdfProject = {
        projectName,
        boxes: boxesToExport,
        rules: currentProject.rules,
        extractedPartsByBoxId: currentProject.extractedPartsByBoxId ?? {},
        settings: getSettings(),
        pieceObservacoes: currentProject.pieceObservacoes ?? {},
      };
      const doc = await buildCutlistPdf(pdfProject);
      doc.save(`${safeProjectName(projectName)}_cutlist.pdf`);
    }, [projectRef]),

    exportarPdfTecnico: useCallback(async () => {
      const currentProject = projectRef.current;
      const boxesToExport = currentProject.boxes ?? [];
      if (boxesToExport.length === 0) {
        alert("Nenhuma caixa no projeto. Gere o design primeiro.");
        return;
      }
      const projectName = currentProject.projectName?.trim() || "Projeto";
      const { ensureLogoIndustrialLoaded } = await import("../../core/pdf/logoIndustrialPublic");
      await ensureLogoIndustrialLoaded();
      const { gerarPdfTecnicoCompleto } = await import("../../core/pdf/gerarPdfTecnico");
      const doc = gerarPdfTecnicoCompleto(boxesToExport, currentProject.rules, projectName, {
        materialId: currentProject.materialId,
        extractedPartsByBoxId: currentProject.extractedPartsByBoxId ?? {},
        pieceObservacoes: currentProject.pieceObservacoes ?? {},
      });
      doc.save(`${safeProjectName(projectName)}_tecnico.pdf`);
    }, [projectRef]),

    exportarPdfUnificado: useCallback(async () => {
      const currentProject = projectRef.current;
      const boxesToExport = currentProject.boxes ?? [];
      if (boxesToExport.length === 0) {
        alert("Nenhuma caixa no projeto. Gere o design primeiro.");
        return;
      }
      const projectName = currentProject.projectName?.trim() || "Projeto";
      const pdfProject = {
        projectName,
        boxes: boxesToExport,
        rules: currentProject.rules,
        materialId: currentProject.materialId,
        extractedPartsByBoxId: currentProject.extractedPartsByBoxId ?? {},
        settings: getSettings(),
        pieceObservacoes: currentProject.pieceObservacoes ?? {},
        remates: currentProject.remates ?? [],
        rodapes: currentProject.rodapes ?? [],
      };
      const doc = await buildUnifiedPdf(pdfProject, industrialContext());
      doc.save(`${safeProjectName(projectName)}_completo.pdf`);
    }, [projectRef, industrialContext]),

    exportarPdfFerragensIndustriais: useCallback(async () => {
      const currentProject = projectRef.current;
      const boxesToExport = currentProject.boxes ?? [];
      if (boxesToExport.length === 0) {
        alert("Nenhuma caixa no projeto. Gere o design primeiro.");
        return;
      }
      const projectName = currentProject.projectName?.trim() || "Projeto";
      const data = buildIndustrialFerragensForProject({
        projectName,
        boxes: boxesToExport,
        rules: currentProject.rules,
        materialId: currentProject.materialId,
        extractedPartsByBoxId: currentProject.extractedPartsByBoxId ?? {},
        remates: currentProject.remates ?? [],
        rodapes: currentProject.rodapes ?? [],
        pieceObservacoes: currentProject.pieceObservacoes ?? {},
      });
      const doc = buildFerragensIndustriaisPdf(data);
      doc.save(industrialFerragensPdfFileName(safeProjectName(projectName)));
    }, [projectRef]),

    exportarXlsxFerragensIndustriais: useCallback(async () => {
      const currentProject = projectRef.current;
      const boxesToExport = currentProject.boxes ?? [];
      if (boxesToExport.length === 0) {
        alert("Nenhuma caixa no projeto. Gere o design primeiro.");
        return;
      }
      const projectName = currentProject.projectName?.trim() || "Projeto";
      const data = buildIndustrialFerragensForProject({
        projectName,
        boxes: boxesToExport,
        rules: currentProject.rules,
        materialId: currentProject.materialId,
        extractedPartsByBoxId: currentProject.extractedPartsByBoxId ?? {},
        remates: currentProject.remates ?? [],
        rodapes: currentProject.rodapes ?? [],
        pieceObservacoes: currentProject.pieceObservacoes ?? {},
      });
      const buffer = await buildFerragensIndustriaisXlsxBuffer(data);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = industrialFerragensXlsxFileName(safeProjectName(projectName));
      a.click();
      URL.revokeObjectURL(url);
    }, [projectRef]),

    exportarPdfsSecoesIndustriais: useCallback(() => {
      exportBottomSectionPdfs();
    }, [exportBottomSectionPdfs]),

    exportarPdfResumoFinanceiro: useCallback(() => {
      exportBottomSectionPdfs("resumoFinanceiro");
    }, [exportBottomSectionPdfs]),

    exportarPdfPecasTotais: useCallback(() => {
      exportBottomSectionPdfs("pecasTotais");
    }, [exportBottomSectionPdfs]),

    exportarPdfFerragensTotais: useCallback(() => {
      exportBottomSectionPdfs("ferragensTotais");
    }, [exportBottomSectionPdfs]),

    exportarPdfTotaisProjeto: useCallback(() => {
      exportBottomSectionPdfs("totaisProjeto");
    }, [exportBottomSectionPdfs]),
  };
}
