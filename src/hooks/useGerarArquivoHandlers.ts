import { createElement, useCallback, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import JSZip from "jszip";
import { useProject } from "../context/useProject";
import { applyResultados } from "../context/projectState";
import { captureRoomSnapshot, serializeState } from "../context/projectPersistence";
import type { ProjectSnapshot, ProjectState } from "../context/projectTypes";
import { getCurrentProjectUser } from "../core/projects/currentUser";
import { saveProject } from "../core/projects/projectsClient";
import { saveProjectRecord } from "../app/PROJETOS/projetosSnapshotCache";
import { buildProjetosPagePath } from "../app/PROJETOS/projetosPageSlug";
import { getSettings } from "../core/settings/settingsService";
import { listMaterials } from "../core/materials/service";
import { buildCutlistItemsForIndustrialExport } from "../core/fabrication/buildCutlistItemsForIndustrialExport";
import {
  terminateIndustrialWorker,
} from "../core/fabrication/industrialWorkerRunner";
import {
  beginIndustrialFileGeneration,
  endIndustrialFileGeneration,
  runAuthorizedIndustrialFileGeneration,
} from "../core/fabrication/industrialGenerationSuspend";
import { measureTime } from "../utils/measureTime";
import { useToast } from "../context/ToastContext";
import { useSettings } from "../context/SettingsContext";
import { gerarPdfTecnicoCompleto } from "../core/pdf/gerarPdfTecnico";
import { buildCutlistPdf } from "../core/pdf/pdfCutlist";
import { buildUnifiedPdf } from "../core/pdf/pdfUnified";
import { UnifiedEtiquetaEngine } from "../core/etiquetas";
import type { CutlistItemForPieces } from "../core/cutlayout/cutLayoutEngine";
import type { CutListItemComPreco } from "../core/types";
import { buildTcnExportBaseName, getDefaultCncLayoutOptions, getFastCncLayoutOptions } from "../core/cnc/cncPipeline";
import {
  formatIndustrialThicknessIssue,
  resolveIndustrialThicknesses,
} from "../core/cnc/industrialThicknessResolution";
import { throwFirstUnresolvedThicknessError } from "../core/industrial/industrialThicknessErrors";
import { isIndustrialError } from "../core/industrial/IndustrialError";
import type { ToastMessage } from "../context/ToastContext";
import {
  industrialThicknessEtiquetasPdfFileName,
  industrialThicknessLayoutPdfFileName,
  industrialThicknessEtiquetasPdfPath,
  industrialThicknessLayoutPdfPath,
  industrialThicknessTcnDirPath,
} from "../core/cnc/industrialThicknessGroups";
import {
  buildCncBundlesPerThickness,
  runCutLayoutPerThickness,
} from "../core/fabrication/industrialPerThicknessPipeline";
import { buildIndustrialManifest } from "../core/fabrication/industrialManifest";
import { buildDrillFilesForProject } from "../core/drill/drillExport";
import { devLogger } from "../utils/devLogger";
import { sanitizeZipPath } from "../utils/sanitization";
import { captureMcDimensionsFromViewer } from "../core/industrial/mcDimensions/mcDimensionsCapture";
import { exportMCDimensionsForZip } from "../core/industrial/mcDimensions/mcDimensionsGenerator";
import { loadMcDimensionsConfig } from "../config/mcDimensionsConfig";
import PiLoader from "../components/PiLoader/PiLoader";

let cutLayoutLoaderRoot: Root | null = null;

function showIndustrialErrorToast(
  showToast: (text: string, type?: ToastMessage["type"], duration?: number) => void,
  err: unknown
): boolean {
  if (!isIndustrialError(err)) return false;
  showToast(err.formatForToast(), "error", 12000);
  return true;
}

function toastExportError(
  showToast: (text: string, type?: ToastMessage["type"], duration?: number) => void,
  err: unknown,
  fallback: string
): void {
  if (showIndustrialErrorToast(showToast, err)) return;
  const msg = err instanceof Error ? err.message : String(err);
  showToast(`${fallback}${msg ? ` — ${msg}` : ""}`, "error");
}

function pushFullExportError(
  errors: Array<{ step: string; message?: string; error?: string }>,
  err: unknown,
  step: string
): void {
  if (isIndustrialError(err)) {
    errors.push({ step: err.getTitle(), message: err.formatForToast() });
    return;
  }
  const msg = err instanceof Error ? err.message : String(err);
  errors.push({ step, message: msg });
}
let cutLayoutLoaderHost: HTMLDivElement | null = null;

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function showCutLayoutLoader() {
  if (typeof document === "undefined") return;
  if (!cutLayoutLoaderHost) {
    cutLayoutLoaderHost = document.createElement("div");
    cutLayoutLoaderHost.id = "pimo-cut-layout-loader-root";
    document.body.appendChild(cutLayoutLoaderHost);
    cutLayoutLoaderRoot = createRoot(cutLayoutLoaderHost);
  }
  cutLayoutLoaderRoot!.render(createElement(PiLoader, { isVisible: true }));
}

function hideCutLayoutLoader() {
  if (!cutLayoutLoaderRoot || !cutLayoutLoaderHost) return;
  cutLayoutLoaderRoot.render(createElement(PiLoader, { isVisible: false }));
  const root = cutLayoutLoaderRoot;
  const host = cutLayoutLoaderHost;
  cutLayoutLoaderRoot = null;
  cutLayoutLoaderHost = null;
  queueMicrotask(() => {
    root.unmount();
    host.remove();
  });
}

function pdfToBlob(doc: { output: (_type: string) => ArrayBuffer | Uint8Array }): Blob {
  const arr = doc.output("arraybuffer");
  const buffer = arr instanceof ArrayBuffer ? arr : new Uint8Array(arr).buffer;
  return new Blob([buffer], { type: "application/pdf" });
}

function tcnMethodSuffix(tcnMetodo: string | undefined): "mo" | "v1" | "v2" | "v2n" | "v3" | "v3n" | "v4" | "v5" | "v6" {
  switch (tcnMetodo) {
    case "nesting_mo":
      return "mo";
    case "v2_new":
      return "v2n";
    case "v2_ramp":
      return "v2";
    case "v3_new":
      return "v3n";
    case "v3_ramp_noflip":
      return "v3";
    case "v4_corner_noflip":
      return "v4";
    case "v5_ramp_noanchor":
      return "v5";
    case "v6_ramp":
      return "v6";
    case "v1_corner":
    default:
      return "v1";
  }
}

type LayoutProgressState = {
  visible: boolean;
  percent: number;
  message: string;
  mode: "pro" | "fast";
};

function isMemoryPressureHigh(): boolean {
  try {
    const perf = performance as unknown as {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
    };
    const mem = perf.memory;
    if (!mem || !Number.isFinite(mem.usedJSHeapSize) || !Number.isFinite(mem.jsHeapSizeLimit) || mem.jsHeapSizeLimit <= 0) {
      return false;
    }
    return mem.usedJSHeapSize / mem.jsHeapSizeLimit >= 0.9;
  } catch {
    return false;
  }
}

/**
 * Fonte única de dados para exportação CNC/TCN.
 * Reutilizada pelo fluxo normal de exportação e por fluxos auxiliares (ex.: variantes v1..v6),
 * para garantir mesma cobertura de peças/painéis.
 */
export function buildItemsForCncExport(
  project: {
    rules: unknown;
    materialId?: string;
    projectName?: string;
    remates?: import("../core/remate/rematePieceTypes").RematePiece[];
    rodapes?: import("../core/rodape/rodapeTypes").ProjectRodape[];
    extractedPartsByBoxId?: Record<string, Record<string, unknown[]>>;
  },
  boxes: Array<{ id: string }>
): Array<Record<string, unknown>> {
  const items = buildCutlistItemsForIndustrialExport({
    boxes: boxes as never[],
    rules: project.rules as never,
    materialId: project.materialId,
    projectName: project.projectName,
    remates: project.remates ?? [],
    rodapes: project.rodapes ?? [],
    extractedPartsByBoxId: project.extractedPartsByBoxId,
  });
  return items as unknown as Array<Record<string, unknown>>;
}

/** Adiciona um PDF ao ZIP apenas se o documento e o blob forem válidos. Retorna true se adicionou. */
function safeAddPdf(
  zip: JSZip,
  zipPath: string,
  doc: { output: (_type: string) => ArrayBuffer | Uint8Array } | null | undefined
): boolean {
  if (!doc || typeof doc.output !== "function") return false;
  const safePath = sanitizeZipPath(zipPath);
  if (!safePath) return false;
  try {
    const blob = pdfToBlob(doc);
    if (!blob || blob.size === 0) return false;
    zip.file(safePath, blob);
    return true;
  } catch {
    return false;
  }
}

function confirmIndustrialThicknessAdjustments(messageDetail: string): boolean {
  if (typeof window === "undefined" || typeof window.confirm !== "function") {
    return true;
  }
  return window.confirm(
    [
      "A matéria-prima selecionada não possui chapa configurada para esta espessura.",
      "Deseja substituir por uma espessura próxima?",
      "",
      messageDetail,
    ].join("\n")
  );
}

export function useGerarArquivoHandlers() {
  const { project, viewerSync } = useProject();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const abortIndustrialLayoutRef = useRef(false);
  const [layoutProgress, setLayoutProgress] = useState<LayoutProgressState>({
    visible: false,
    percent: 0,
    message: "",
    mode: "pro",
  });
  const boxes = useMemo(() => project.boxes ?? [], [project.boxes]);
  const hasBoxes = boxes.length > 0;
  const slug =
    (project.projectName || "projeto")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s+/g, "_") || "projeto";
  const tcnSuffix = tcnMethodSuffix(settings?.cnc?.tcnMetodo);

  const pdfProject = useCallback(
    () => ({
      projectName: project.projectName ?? "Projeto",
      boxes,
      rules: project.rules,
      materialId: project.materialId,
      extractedPartsByBoxId: project.extractedPartsByBoxId ?? {},
      settings: settings ?? undefined,
      pieceObservacoes: project.pieceObservacoes ?? {},
    }),
    [project, boxes, settings]
  );

  const prepareItemsForCnc = useCallback(
    <T extends CutlistItemForPieces>(items: T[], materialsSnapshot: ReturnType<typeof listMaterials>): T[] | null => {
      const resolution = resolveIndustrialThicknesses(items, materialsSnapshot);
      if (resolution.unresolved.length > 0) {
        throwFirstUnresolvedThicknessError(items, resolution.unresolved);
      }
      if (resolution.adjustments.length > 0) {
        const detail = resolution.adjustments.map(formatIndustrialThicknessIssue).join("\n");
        const accepted = confirmIndustrialThicknessAdjustments(detail);
        if (!accepted) {
          showToast(`Exportação CNC cancelada: ${detail}`, "warning");
          return null;
        }
      }
      return resolution.items;
    },
    [showToast]
  );

  const cancelIndustrialLayout = useCallback(() => {
    abortIndustrialLayoutRef.current = true;
    terminateIndustrialWorker();
    setLayoutProgress((prev) =>
      prev.visible
        ? { ...prev, message: "Cancelando otimização PRO…" }
        : prev
    );
  }, []);

  const onPdfTecnico = useCallback(() => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    const proj = pdfProject();
    const doc = gerarPdfTecnicoCompleto(proj.boxes, proj.rules, proj.projectName, {
      materialId: proj.materialId,
      extractedPartsByBoxId: proj.extractedPartsByBoxId,
      pieceObservacoes: proj.pieceObservacoes,
    });
    doc.save(`${slug}_tecnico.pdf`);
  }, [hasBoxes, showToast, pdfProject, slug]);

  const onCutlist = useCallback(async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    beginIndustrialFileGeneration();
    try {
      const doc = await buildCutlistPdf(pdfProject());
      doc.save(`${slug}_cutlist.pdf`);
    } catch (err) {
      devLogger.error("Erro ao gerar PDF de cutlist:", err);
      showToast("Erro ao gerar PDF.", "error");
    } finally {
      endIndustrialFileGeneration();
    }
  }, [hasBoxes, showToast, pdfProject, slug]);

  /** Gera apenas o PDF unificado (técnico + cutlist num único documento). */
  const onUnificado = useCallback(async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    beginIndustrialFileGeneration();
    try {
      const doc = await buildUnifiedPdf(pdfProject());
      doc.save(`${slug}_unificado.pdf`);
    } catch (err) {
      devLogger.error("Erro ao gerar PDF unificado:", err);
      showToast("Erro ao gerar PDF unificado.", "error");
    } finally {
      endIndustrialFileGeneration();
    }
  }, [hasBoxes, showToast, pdfProject, slug]);

  /** Gera e descarrega os três PDFs em separado: Cutlist, PDF Técnico, Arquivo Unificado. */
  const onAmbos = useCallback(async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    beginIndustrialFileGeneration();
    try {
      const proj = pdfProject();
      const docCutlist = await buildCutlistPdf(proj);
      docCutlist.save(`${slug}_cutlist.pdf`);
      const docTecnico = gerarPdfTecnicoCompleto(proj.boxes, proj.rules, proj.projectName, {
        materialId: proj.materialId,
        extractedPartsByBoxId: proj.extractedPartsByBoxId,
        pieceObservacoes: proj.pieceObservacoes,
      });
      docTecnico.save(`${slug}_tecnico.pdf`);
      const docUnificado = await buildUnifiedPdf(proj);
      docUnificado.save(`${slug}_unificado.pdf`);
      showToast("Cutlist, PDF Técnico e Unificado gerados.", "info");
    } catch (err) {
      devLogger.error("Erro ao gerar PDFs:", err);
      showToast("Erro ao gerar PDFs.", "error");
    } finally {
      endIndustrialFileGeneration();
    }
  }, [hasBoxes, showToast, pdfProject, slug]);

  const onEtiquetas = useCallback(async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    beginIndustrialFileGeneration();
    try {
      const proj = pdfProject();
      const allItems = buildCutlistItemsForIndustrialExport({
        boxes,
        rules: project.rules,
        materialId: project.materialId,
        projectName: project.projectName,
        remates: project.remates ?? [],
        rodapes: project.rodapes ?? [],
        extractedPartsByBoxId: project.extractedPartsByBoxId,
      });
      const settingsSnapshot = getSettings();
      const materialsSnapshot = listMaterials();
      const cncItems = prepareItemsForCnc(allItems as CutlistItemForPieces[], materialsSnapshot);
      if (!cncItems) return;

      const thicknessBundles = await runCutLayoutPerThickness(
        settingsSnapshot,
        materialsSnapshot,
        cncItems,
        getDefaultCncLayoutOptions(),
        {
          projectName: project.projectName ?? "Projeto",
          boxes: proj.boxes ?? boxes,
        }
      );

      if (thicknessBundles.length === 0) {
        showToast("Nenhuma peça com espessura válida para etiquetas.", "warning");
        return;
      }

      for (const bundle of thicknessBundles) {
        const nestingPlacements = bundle.layoutResult.sheets.flatMap((s) => s.placements);
        const doc = await UnifiedEtiquetaEngine.build({
          ...proj,
          precomputedItems: bundle.items as CutListItemComPreco[],
          cutLayoutPlacements: nestingPlacements.length > 0 ? nestingPlacements : undefined,
        });
        doc.save(`${slug}_${industrialThicknessEtiquetasPdfFileName(bundle.bucket)}`);
      }
      showToast(
        thicknessBundles.length === 1
          ? "PDF de etiquetas (UEE v5) gerado."
          : `${thicknessBundles.length} PDFs de etiquetas gerados (um por espessura).`,
        "info"
      );
    } catch (err) {
      devLogger.error("Erro ao gerar PDF de etiquetas:", err);
      toastExportError(showToast, err, "Erro ao gerar PDF de etiquetas.");
    } finally {
      endIndustrialFileGeneration();
    }
  }, [hasBoxes, showToast, pdfProject, slug, boxes, project, prepareItemsForCnc]);

  const onLayoutCorte = useCallback(async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    beginIndustrialFileGeneration();
    try {
      const allItems = buildCutlistItemsForIndustrialExport({
        boxes,
        rules: project.rules,
        materialId: project.materialId,
        projectName: project.projectName,
        remates: project.remates ?? [],
        rodapes: project.rodapes ?? [],
        extractedPartsByBoxId: project.extractedPartsByBoxId,
      });
      const settingsSnapshot = getSettings();
      const materialsSnapshot = listMaterials();
      const cncItems = prepareItemsForCnc(allItems as CutlistItemForPieces[], materialsSnapshot);
      if (!cncItems) return;

      const thicknessBundles = await buildCncBundlesPerThickness(
        settingsSnapshot,
        materialsSnapshot,
        { projectName: project.projectName ?? "Projeto" },
        cncItems,
        getDefaultCncLayoutOptions()
      );

      if (thicknessBundles.length === 0) {
        showToast("Nenhuma peça com espessura válida para o layout de corte.", "warning");
        return;
      }

      const { buildCutLayoutPdf } = await import("../core/cutlayout/cutLayoutPdf");
      for (const bundle of thicknessBundles) {
        const doc = await buildCutLayoutPdf(bundle.cncBundle.layoutResult, {
          projectName: project.projectName ?? "Projeto",
        });
        doc.save(`${slug}_${industrialThicknessLayoutPdfFileName(bundle.bucket)}`);
      }
    } catch (err) {
      devLogger.error("Erro ao gerar layout de corte:", err);
      toastExportError(showToast, err, "Erro ao gerar layout de corte.");
    } finally {
      endIndustrialFileGeneration();
    }
  }, [
    hasBoxes,
    showToast,
    boxes,
    project.rules,
    project.materialId,
    project.projectName,
    project.extractedPartsByBoxId,
    slug,
    prepareItemsForCnc,
  ]);

  /** Handler legado: gera Layout de Corte PRO (distribuição das peças em chapa MDF). */
  const onLayoutCortePro = useCallback(async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    try {
      showCutLayoutLoader();
      await yieldToMainThread();
      beginIndustrialFileGeneration();
      try {
        viewerSync.setUltraPerformanceMode(true);
      } catch {
        /* ignore */
      }
      const allItems = buildCutlistItemsForIndustrialExport({
        boxes,
        rules: project.rules,
        materialId: project.materialId,
        projectName: project.projectName,
        remates: project.remates ?? [],
        rodapes: project.rodapes ?? [],
        extractedPartsByBoxId: project.extractedPartsByBoxId,
      });

      const settingsSnapshot = getSettings();
      const materialsSnapshot = listMaterials();
      const cncItems = prepareItemsForCnc(allItems as CutlistItemForPieces[], materialsSnapshot);
      if (!cncItems) return;

      await yieldToMainThread();

      const thicknessBundles = await measureTime("Layout de corte PRO (layout CNC por espessura)", async () =>
        buildCncBundlesPerThickness(
          settingsSnapshot,
          materialsSnapshot,
          { projectName: project.projectName ?? "Projeto" },
          cncItems,
          {
            ...getDefaultCncLayoutOptions(),
          }
        )
      );

      if (thicknessBundles.length === 0) {
        showToast("Nenhuma peça com espessura válida para o layout de corte.", "warning");
        return;
      }

      const rejectedTotal = thicknessBundles.reduce((sum, bundle) => {
        const rejected = bundle.layoutResult.diagnostics?.rejectedByLimit?.length ?? 0;
        return sum + rejected;
      }, 0);
      if (rejectedTotal > 0) {
        showToast(
          `Atenção: ${rejectedTotal} peça(s) não couberam no layout e foram omitidas.`,
          "warning"
        );
      }

      await yieldToMainThread();
      const { buildCutLayoutPdf } = await import("../core/cutlayout/cutLayoutPdf");
      for (const bundle of thicknessBundles) {
        const doc = await buildCutLayoutPdf(bundle.cncBundle.layoutResult, {
          projectName: `${project.projectName ?? "Projeto"} — ${bundle.bucket}`,
        });
        doc.save(`${slug}_${industrialThicknessLayoutPdfFileName(bundle.bucket)}`);
      }
      showToast(
        thicknessBundles.length === 1
          ? "Layout de Corte PRO gerado."
          : `${thicknessBundles.length} layouts de corte PRO gerados (um por espessura).`,
        "info"
      );
    } catch (err) {
      devLogger.error("Layout de Corte PRO:", err);
      toastExportError(showToast, err, "Layout de Corte PRO: falha");
    } finally {
      try {
        viewerSync.setUltraPerformanceMode(false);
      } catch {
        /* ignore */
      }
      endIndustrialFileGeneration();
      hideCutLayoutLoader();
    }
  }, [
    hasBoxes,
    showToast,
    boxes,
    project,
    slug,
    viewerSync,
    prepareItemsForCnc,
  ]);

  const onExportarCnc = useCallback(async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    showToast("Gerando layout industrial otimizado… aguarde.", "info");
    abortIndustrialLayoutRef.current = false;
    const forceFastMode = false;
    setLayoutProgress({
      visible: true,
      percent: 1,
      message: "Gerando layout industrial otimizado… aguarde.",
      mode: "pro",
    });

    beginIndustrialFileGeneration();
    try {
      viewerSync.setUltraPerformanceMode(true);
    } catch {
      /* ignore */
    }

    try {
      await measureTime("Exportação CNC (projeto único)", async () => {
        const allItems = buildItemsForCncExport(project, boxes) as CutlistItemForPieces[];
        const settingsSnapshot = getSettings();
        const materialsSnapshot = listMaterials();
        const cncItems = prepareItemsForCnc(allItems, materialsSnapshot);
        if (!cncItems) {
          setLayoutProgress({ visible: false, percent: 0, message: "", mode: "pro" });
          return;
        }

        const cncProjectStub = { projectName: project.projectName ?? "Projeto" };

        const collectFiles = async (mode: "pro" | "fast"): Promise<Array<{ name: string; tcn: string; base: string }>> => {
          if (
            abortIndustrialLayoutRef.current ||
            isMemoryPressureHigh()
          ) {
            const err = new Error("CutLayout aborted");
            err.name = "CutLayoutAbortedError";
            throw err;
          }
          const layoutOptionsBase = mode === "pro" ? getDefaultCncLayoutOptions() : getFastCncLayoutOptions();
          setLayoutProgress((prev) => ({
            ...prev,
            visible: true,
            mode,
            percent: Math.max(prev.percent, 50),
            message: "Gerando layout industrial otimizado… aguarde.",
          }));
          const thicknessBundles = await buildCncBundlesPerThickness(
            settingsSnapshot,
            materialsSnapshot,
            cncProjectStub,
            cncItems,
            layoutOptionsBase
          );
          const rows: Array<{ name: string; tcn: string; base: string }> = [];
          for (const bundle of thicknessBundles) {
            const files = bundle.cncBundle.cnc?.files ?? [];
            if (!files.length) continue;
            const tcnDir = industrialThicknessTcnDirPath(bundle.bucket);
            const usedNames = new Set<string>();
            for (const file of files) {
              const base = buildTcnExportBaseName(
                bundle.cncBundle.layoutResult,
                file.panelIndex,
                files.length
              );
              let finalBase = base;
              let dedupeIndex = 2;
              while (usedNames.has(finalBase)) {
                finalBase = `${base}_${dedupeIndex}`;
                dedupeIndex += 1;
              }
              usedNames.add(finalBase);
              rows.push({
                name: `${tcnDir}/${finalBase}_cnc_${tcnSuffix}.tcn`,
                tcn: file.tcn,
                base: file.filenameBase,
              });
            }
          }
          return rows;
        };

        let rows: Array<{ name: string; tcn: string; base: string }> = [];
        if (forceFastMode) {
          rows = await collectFiles("fast");
        } else {
          try {
            rows = await collectFiles("pro");
          } catch (err) {
            const name = (err as { name?: string })?.name;
            const shouldFallback =
              name === "CutLayoutAbortedError" ||
              abortIndustrialLayoutRef.current ||
              isMemoryPressureHigh();
            if (!shouldFallback) throw err;
            setLayoutProgress({
              visible: true,
              percent: 40,
              message: "Layout PRO cancelado. A gerar modo rápido…",
              mode: "fast",
            });
            showToast("Layout PRO interrompido. A usar Fast Mode.", "warning");
            rows = await collectFiles("fast");
          }
        }

        if (rows.length === 0) {
          showToast("Nenhuma peça na cutlist para exportar CNC.", "warning");
          return;
        }
        const urls: string[] = [];
        for (const row of rows) {
          const tcnBlob = new Blob([row.tcn], { type: "text/plain" });
          const tcnUrl = URL.createObjectURL(tcnBlob);
          urls.push(tcnUrl);
          const link1 = document.createElement("a");
          link1.href = tcnUrl;
          link1.download = row.name;
          link1.click();
        }
        setTimeout(() => urls.forEach((u) => URL.revokeObjectURL(u)), 500);
        setLayoutProgress({
          visible: true,
          percent: 100,
          message: "Layout concluído. A transferir ficheiros…",
          mode: abortIndustrialLayoutRef.current ? "fast" : "pro",
        });
        setTimeout(() => {
          setLayoutProgress({ visible: false, percent: 0, message: "", mode: "pro" });
        }, 700);
      });
    } catch (err) {
      toastExportError(showToast, err, "Falha na exportação CNC");
      setLayoutProgress({ visible: false, percent: 0, message: "", mode: "pro" });
    } finally {
      try {
        viewerSync.setUltraPerformanceMode(false);
      } catch {
        /* ignore */
      }
      endIndustrialFileGeneration();
    }
  }, [hasBoxes, showToast, project, boxes, tcnSuffix, viewerSync, prepareItemsForCnc]);

  /** TCN (via fluxo existente) + XML de furação; só orquestração, mesmas funções de export. */
  const onArquivosCnc = useCallback(async () => {
    await onExportarCnc();
    if (!hasBoxes) return;
    try {
      const allItems = buildCutlistItemsForIndustrialExport({
        boxes,
        rules: project.rules,
        materialId: project.materialId,
        projectName: project.projectName,
        remates: project.remates ?? [],
        rodapes: project.rodapes ?? [],
        extractedPartsByBoxId: project.extractedPartsByBoxId,
      });
      const drillFiles = buildDrillFilesForProject(allItems, {
        projectName: project.projectName ?? "Projeto",
        boxes: boxes ?? [],
        rules: project.rules,
      });
      if (drillFiles.length === 0) {
        showToast("Nenhum ficheiro XML de furação para exportar.", "info");
        return;
      }
      const urls: string[] = [];
      for (const f of drillFiles) {
        const blob = new Blob([f.xml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        urls.push(url);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${f.filenameBase}.xml`;
        a.click();
      }
      setTimeout(() => urls.forEach((u) => URL.revokeObjectURL(u)), 500);
      showToast("XML de furação gerado.", "info");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Falha ao gerar XML: ${msg}`, "error");
    }
  }, [onExportarCnc, hasBoxes, boxes, project, showToast]);

  /** Gera todos os arquivos disponíveis, coloca numa pasta (ZIP) e descarrega. */
  const onArquivoCompleto = useCallback(async () => {
    let redirectProjectPagePath: string | null = null;

    try {
      if (!hasBoxes) {
        showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
        return;
      }

      try {
        viewerSync.setUltraPerformanceMode(true);
      } catch {
        /* ignore */
      }

      await runAuthorizedIndustrialFileGeneration("all", async () =>
      measureTime("Arquivo completo (ZIP)", async () => {
      type StepError = { step: string; message?: string; error?: string; detail?: string };
      const errors: StepError[] = [];
      const zip = new JSZip();
      const proj = pdfProject();
      const tcnManifestFiles: Array<{ path: string; content: string }> = [];
      let abortFullExport = false;

      // --- Snapshot final → cache PROJETOS (antes de PDFs/ZIP) ---
      try {
        const currentUser = getCurrentProjectUser();
        const stateForSnapshot = applyResultados(project as ProjectState);
        const persistedSnapshot: ProjectSnapshot = {
          projectState: serializeState(stateForSnapshot),
          viewerSnapshot: viewerSync.saveViewerSnapshot(),
          roomSnapshot: captureRoomSnapshot(),
        };
        const saved = await saveProject({
          name: stateForSnapshot.projectName ?? project.projectName ?? "Projeto",
          ownerId: currentUser.ownerId,
          ownerName: currentUser.ownerName,
          snapshot: persistedSnapshot,
          localProjectId: project.currentProjectId ?? undefined,
        });
        const internalProjectId = saved?.id ?? project.currentProjectId ?? null;
        const projectName =
          saved?.name ?? stateForSnapshot.projectName ?? project.projectName ?? "Projeto";
        if (internalProjectId) {
          await saveProjectRecord(internalProjectId, persistedSnapshot, {
            ...(saved ?? {}),
            name: projectName,
          });
          redirectProjectPagePath = buildProjetosPagePath({ name: projectName });
        }
      } catch (err) {
        devLogger.warn("PROJETOS: falha ao guardar snapshot antes do arquivo completo", err);
      }

      const allItems = buildCutlistItemsForIndustrialExport({
        boxes,
        rules: project.rules,
        materialId: project.materialId,
        projectName: project.projectName,
        remates: project.remates ?? [],
        rodapes: project.rodapes ?? [],
        extractedPartsByBoxId: project.extractedPartsByBoxId,
      });

      const settingsSnapshot = getSettings();
      const materialsSnapshot = listMaterials();
      const cncProjectStub = { projectName: project.projectName ?? "Projeto" };

      const safeSlug = sanitizeZipPath(slug) || "projeto";

      // --- Cutlist PDF ---
      try {
        const docCutlist = await buildCutlistPdf(proj);
        if (!safeAddPdf(zip, `${safeSlug}_cutlist.pdf`, docCutlist)) {
          errors.push({ step: "Cutlist PDF", message: "Documento ou blob inválido." });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ step: "Cutlist PDF", message: msg });
        devLogger.error("Full export: Cutlist PDF", err);
      }

      // --- PDF Técnico ---
      try {
        const docTecnico = gerarPdfTecnicoCompleto(proj.boxes, proj.rules, proj.projectName, {
          materialId: proj.materialId,
          extractedPartsByBoxId: proj.extractedPartsByBoxId,
          pieceObservacoes: proj.pieceObservacoes,
        });
        if (!safeAddPdf(zip, `${safeSlug}_tecnico.pdf`, docTecnico)) {
          errors.push({ step: "PDF Técnico", message: "Documento ou blob inválido." });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ step: "PDF Técnico", message: msg });
        devLogger.error("Full export: PDF Técnico", err);
      }

      // --- Unificado ---
      try {
        const docUnificado = await buildUnifiedPdf(proj);
        if (!safeAddPdf(zip, `${safeSlug}_unificado.pdf`, docUnificado)) {
          errors.push({ step: "PDF Unificado", message: "Documento ou blob inválido." });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ step: "PDF Unificado", message: msg });
        devLogger.error("Full export: PDF Unificado", err);
      }

      // --- Nesting por espessura (fonte única CNC para Layout PRO + Etiquetas + TCN) ---
      let thicknessCncBundles: Awaited<ReturnType<typeof buildCncBundlesPerThickness>> = [];
      try {
        const cncItemsForLayout = prepareItemsForCnc(allItems as CutlistItemForPieces[], materialsSnapshot);
        if (!cncItemsForLayout) {
          abortFullExport = true;
          throw new Error("Exportação cancelada por matéria-prima sem chapa válida.");
        }
        showCutLayoutLoader();
        await yieldToMainThread();
        thicknessCncBundles = await buildCncBundlesPerThickness(
          settingsSnapshot,
          materialsSnapshot,
          cncProjectStub,
          cncItemsForLayout,
          {
            ...getDefaultCncLayoutOptions(),
          }
        );
      } catch (err) {
        pushFullExportError(errors, err, "Nesting por espessura");
        devLogger.error("Full export: Nesting por espessura", err);
      } finally {
        hideCutLayoutLoader();
      }

      // --- Etiquetas UEE (um PDF por espessura em cnc/<espessura>/) ---
      try {
        const { buildCutLayoutPdf } = await import("../core/cutlayout/cutLayoutPdf");
        for (const bundle of thicknessCncBundles) {
          const layoutResult = bundle.cncBundle.layoutResult;
          const nestingPlacements = layoutResult.sheets.flatMap((s) => s.placements);
          const docEtiquetas = await UnifiedEtiquetaEngine.build({
            ...proj,
            precomputedItems: bundle.items as CutListItemComPreco[],
            cutLayoutPlacements: nestingPlacements.length > 0 ? nestingPlacements : undefined,
          });
          const etiquetasPath = industrialThicknessEtiquetasPdfPath(bundle.bucket);
          if (!safeAddPdf(zip, etiquetasPath, docEtiquetas)) {
            errors.push({
              step: `PDF Etiquetas (${bundle.bucket})`,
              message: "Documento ou blob inválido.",
            });
          }

          const docLayout = await buildCutLayoutPdf(layoutResult, {
            projectName: `${project.projectName ?? "Projeto"} — ${bundle.bucket}`,
          });
          const layoutPath = industrialThicknessLayoutPdfPath(bundle.bucket);
          if (!safeAddPdf(zip, layoutPath, docLayout)) {
            errors.push({
              step: `Layout de Corte PRO (${bundle.bucket})`,
              message: "Falha ao adicionar PDF ao ZIP.",
            });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ step: "PDF Etiquetas / Layout PRO", message: msg });
        devLogger.error("Full export: Etiquetas / Layout PRO por espessura", err);
      }

      // --- CNC (TCN): um nesting por espessura ---
      try {
        if (thicknessCncBundles.length === 0) {
          abortFullExport = true;
          throw new Error("Nenhum layout CNC disponível para gerar TCN.");
        }
        const usedTcnNamesByPath = new Set<string>();
        let tcnFilesAdded = 0;
        for (const bundle of thicknessCncBundles) {
          const files = bundle.cncBundle.cnc?.files ?? [];
          for (const file of files) {
            if (!file || file.tcn == null) {
              errors.push({
                step: "CNC",
                message: `Painel ${file?.panelIndex ?? "?"} sem TCN (${bundle.bucket}).`,
              });
              continue;
            }
            const tcnDir = industrialThicknessTcnDirPath(bundle.bucket);
            const base = buildTcnExportBaseName(
              bundle.cncBundle.layoutResult,
              file.panelIndex,
              files.length
            );
            let finalBase = base;
            let dedupeIndex = 2;
            while (usedTcnNamesByPath.has(`${tcnDir}/${finalBase}`)) {
              finalBase = `${base}_${dedupeIndex}`;
              dedupeIndex += 1;
            }
            usedTcnNamesByPath.add(`${tcnDir}/${finalBase}`);

            const tcnPathFinal = sanitizeZipPath(
              `${tcnDir}/${finalBase}_cnc_${tcnSuffix}.tcn`
            );
            if (tcnPathFinal && typeof file.tcn === "string") {
              zip.file(tcnPathFinal, file.tcn);
              tcnManifestFiles.push({ path: tcnPathFinal, content: file.tcn });
              tcnFilesAdded += 1;
            }
          }
        }
        if (allItems.length > 0 && tcnFilesAdded === 0) {
          errors.push({ step: "CNC (TCN)", message: "Nenhum ficheiro TCN foi gerado." });
        }
      } catch (err) {
        pushFullExportError(errors, err, "CNC (TCN)");
        devLogger.error("Full export: CNC", err);
      }

      // --- Manifesto de proteção dos TCNs (não altera conteúdo dos .tcn) ---
      try {
        if (tcnManifestFiles.length > 0) {
          const manifest = await buildIndustrialManifest(tcnManifestFiles);
          zip.file("manifest-industrial.json", JSON.stringify(manifest, null, 2));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ step: "Manifesto Industrial", message: msg });
        devLogger.error("Full export: manifest-industrial", err);
      }

      // --- MC Dimensions (overlay técnico — pipeline independente) ---
      if (!abortFullExport && loadMcDimensionsConfig().enabled) {
        try {
          const dimensionsData = await captureMcDimensionsFromViewer({
            getPrintReadyDimensions: () => viewerSync.getPrintReadyDimensions?.() ?? { entries: [], generatedAt: Date.now() },
            setDimensionsOverlayVisible: viewerSync.setDimensionsOverlayVisible,
            getDimensionsOverlayVisible: viewerSync.getDimensionsOverlayVisible,
            renderScene: (opts) =>
              viewerSync.renderScene(opts as unknown as Parameters<typeof viewerSync.renderScene>[0]),
          });
          const mcFiles = await exportMCDimensionsForZip(dimensionsData);
          for (const f of mcFiles) {
            zip.file(f.path, f.blob);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push({ step: "MC Dimensions", message: msg });
          devLogger.error("Full export: MC Dimensions", err);
        }
      }

      // --- DRILL (XML): um ficheiro por lateral ---
      if (!abortFullExport) {
        try {
          const drillFiles = buildDrillFilesForProject(allItems, {
            projectName: project.projectName ?? "Projeto",
            boxes: boxes ?? [],
            rules: project.rules,
          });
          for (const f of drillFiles) {
            const path = `drill/XML/${f.filenameBase}.xml`;
            zip.file(path, f.xml);
          }
        } catch (err) {
          errors.push({ step: "DRILL (XML)", error: String(err) });
        }
      }

      // --- Gerar e descarregar ZIP ---
      if (!abortFullExport) {
        try {
          const blob = await zip.generateAsync({ type: "blob" });
          if (!blob || blob.size === 0) {
            errors.push({ step: "ZIP", message: "ZIP gerado está vazio ou inválido." });
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${safeSlug}_completo.zip`;
            a.click();
            URL.revokeObjectURL(url);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push({ step: "ZIP (generateAsync)", message: msg });
          devLogger.error("Full export: zip.generateAsync", err);
        }
      }

      if (errors.length > 0) {
        const first = errors[0];
        const detail = `${first.step}: ${first.message ?? first.error ?? "Erro desconhecido"}`;
        devLogger.error("Erro ao gerar arquivo completo:", errors);
        showToast(`Erro ao gerar arquivo completo — ${detail}`, "error");
      } else {
        showToast("Arquivo completo (ZIP) gerado.", "info");
        if (redirectProjectPagePath && typeof window !== "undefined") {
          window.location.href = redirectProjectPagePath;
        }
      }
      }));
    } catch (err) {
      devLogger.error("Arquivo completo: falha global", err);
      toastExportError(showToast, err, "Erro ao gerar arquivo completo");
    } finally {
      try {
        viewerSync.setUltraPerformanceMode(false);
      } catch {
        /* ignore */
      }
    }
  }, [
    hasBoxes,
    showToast,
    pdfProject,
    slug,
    boxes,
    project,
    tcnSuffix,
    viewerSync,
    prepareItemsForCnc,
  ]);

  return {
    hasBoxes,
    layoutProgress,
    cancelIndustrialLayout,
    onPdfTecnico,
    onCutlist,
    onUnificado,
    onAmbos,
    onArquivoCompleto,
    onLayoutCorte,
    onLayoutCortePro,
    onEtiquetas,
    onExportarCnc,
    onArquivosCnc,
  };
}
