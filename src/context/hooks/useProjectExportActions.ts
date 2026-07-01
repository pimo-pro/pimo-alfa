/**
 * Ações de exportação (PDF cutlist, técnico, unificado).
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

export interface UseProjectExportActionsParams {
  projectRef: React.MutableRefObject<ProjectState>;
}

const safeProjectName = (name: string): string =>
  name.replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s+/g, "_") || "projeto";

export function useProjectExportActions({ projectRef }: UseProjectExportActionsParams) {
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
      const doc = await buildUnifiedPdf(pdfProject);
      doc.save(`${safeProjectName(projectName)}_completo.pdf`);
    }, [projectRef]),

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
  };
}
