import { createElement, useCallback, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import JSZip from "jszip";
import { useProject } from "../context/useProject";
import { getSettings } from "../core/settings/settingsService";
import { listMaterials } from "../core/materials/service";
import { buildCutlistItemsForIndustrialExport } from "../core/fabrication/buildCutlistItemsForIndustrialExport";
import {
  buildCncFromCutlistItemsInWorker,
  runCutLayoutInWorker,
  terminateIndustrialWorker,
} from "../core/fabrication/industrialWorkerRunner";
import {
  beginIndustrialFileGeneration,
  endIndustrialFileGeneration,
} from "../core/fabrication/industrialGenerationSuspend";
import { measureTime } from "../utils/measureTime";
import { useToast } from "../context/ToastContext";
import { useSettings } from "../context/SettingsContext";
import { gerarPdfTecnicoCompleto } from "../core/pdf/gerarPdfTecnico";
import { buildCutlistPdf } from "../core/pdf/pdfCutlist";
import { buildUnifiedPdf } from "../core/pdf/pdfUnified";
import { buildEtiquetasPdf } from "../core/pdf/pdfEtiquetas";
import { cutlistToPieces, type CutlistItemForPieces } from "../core/cutlayout/cutLayoutEngine";
import type { CutLayoutResult } from "../core/cutlayout/cutLayoutTypes";
import { loadLabelDesignerConfig, hasStoredLabelDesignerConfig } from "../core/labelDesigner/labelDesignerStorage";
import { getDefaultCncLayoutOptions, getFastCncLayoutOptions, getSheetDefinitionFromSettings } from "../core/cnc/cncPipeline";
import { buildDrillFilesForProject } from "../core/drill/drillExport";
import { devLogger } from "../utils/devLogger";
import { sanitizeZipPath } from "../utils/sanitization";
import PiLoader from "../components/PiLoader/PiLoader";

let cutLayoutLoaderRoot: Root | null = null;
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

function formatThicknessBucket(thicknessMm: number): string {
  if (!Number.isFinite(thicknessMm) || thicknessMm <= 0) return "0mm";
  const rounded = Math.round(thicknessMm * 100) / 100;
  const label = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", "_");
  return `${label}mm`;
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
    extractedPartsByBoxId?: Record<string, Record<string, unknown[]>>;
  },
  boxes: Array<{ id: string }>
): Array<Record<string, unknown>> {
  const items = buildCutlistItemsForIndustrialExport({
    boxes: boxes as never[],
    rules: project.rules as never,
    materialId: project.materialId,
    projectName: project.projectName,
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
    }),
    [project, boxes, settings]
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
    });
    doc.save(`${slug}_tecnico.pdf`);
  }, [hasBoxes, showToast, pdfProject, slug]);

  const onCutlist = useCallback(async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    try {
      const doc = await buildCutlistPdf(pdfProject());
      doc.save(`${slug}_cutlist.pdf`);
    } catch (err) {
      devLogger.error("Erro ao gerar PDF de cutlist:", err);
      showToast("Erro ao gerar PDF.", "error");
    }
  }, [hasBoxes, showToast, pdfProject, slug]);

  /** Gera apenas o PDF unificado (técnico + cutlist num único documento). */
  const onUnificado = useCallback(async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    try {
      const doc = await buildUnifiedPdf(pdfProject());
      doc.save(`${slug}_unificado.pdf`);
    } catch (err) {
      devLogger.error("Erro ao gerar PDF unificado:", err);
      showToast("Erro ao gerar PDF unificado.", "error");
    }
  }, [hasBoxes, showToast, pdfProject, slug]);

  /** Gera e descarrega os três PDFs em separado: Cutlist, PDF Técnico, Arquivo Unificado. */
  const onAmbos = useCallback(async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    try {
      const proj = pdfProject();
      const docCutlist = await buildCutlistPdf(proj);
      docCutlist.save(`${slug}_cutlist.pdf`);
      const docTecnico = gerarPdfTecnicoCompleto(proj.boxes, proj.rules, proj.projectName, {
        materialId: proj.materialId,
      });
      docTecnico.save(`${slug}_tecnico.pdf`);
      const docUnificado = await buildUnifiedPdf(proj);
      docUnificado.save(`${slug}_unificado.pdf`);
      showToast("Cutlist, PDF Técnico e Unificado gerados.", "info");
    } catch (err) {
      devLogger.error("Erro ao gerar PDFs:", err);
      showToast("Erro ao gerar PDFs.", "error");
    }
  }, [hasBoxes, showToast, pdfProject, slug]);

  const onEtiquetas = useCallback(async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    try {
      const designerConfig = hasStoredLabelDesignerConfig() ? loadLabelDesignerConfig() : undefined;
      const doc = await buildEtiquetasPdf({ ...pdfProject(), designerConfig });
      doc.save(`${slug}_etiquetas.pdf`);
    } catch (err) {
      devLogger.error("Erro ao gerar PDF de etiquetas:", err);
      showToast("Erro ao gerar PDF.", "error");
    }
  }, [hasBoxes, showToast, pdfProject, slug]);

  const onLayoutCorte = useCallback(async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    const allItems = buildCutlistItemsForIndustrialExport({
      boxes,
      rules: project.rules,
      materialId: project.materialId,
      projectName: project.projectName,
      extractedPartsByBoxId: project.extractedPartsByBoxId,
    });
    const pieces = cutlistToPieces(allItems);
    if (pieces.length === 0) {
      showToast("Nenhuma peça na cutlist para o layout de corte.", "warning");
      return;
    }
    const sheetDef = getSheetDefinitionFromSettings();
    const settingsSnapshot = getSettings();
    const materialsSnapshot = listMaterials();
    const nestingEngine = (getSettings()?.nesting?.nestingEngine ?? "classic") as "classic" | "strip";
    const result = await runCutLayoutInWorker(settingsSnapshot, materialsSnapshot, pieces, {
      ...getDefaultCncLayoutOptions(nestingEngine),
      originTopRight: true,
      sheetLargura_mm: sheetDef.largura_mm,
      sheetAltura_mm: sheetDef.altura_mm,
    });
    const { buildCutLayoutPdf } = await import(
      "../core/cutlayout/cutLayoutPdf"
    );
    const doc = await buildCutLayoutPdf(result, {
      projectName: project.projectName ?? "Projeto",
      nestingTopRightOrigin: true,
    });
    doc.save(`${slug}_layout_corte.pdf`);
  }, [
    hasBoxes,
    showToast,
    boxes,
    project.rules,
    project.materialId,
    project.projectName,
    project.extractedPartsByBoxId,
    slug,
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
        extractedPartsByBoxId: project.extractedPartsByBoxId,
      });

      const pieces = cutlistToPieces(allItems, {
        projectName: project.projectName ?? "Projeto",
        boxes,
      });
      if (pieces.length === 0) {
        showToast("Nenhuma peça na cutlist para o layout de corte.", "warning");
        return;
      }

      await yieldToMainThread();

      const sheetDef = getSheetDefinitionFromSettings();
      const settingsSnapshot = getSettings();
      const materialsSnapshot = listMaterials();
      const nestingEngine = (getSettings()?.nesting?.nestingEngine ?? "classic") as "classic" | "strip";
      const result = await measureTime("Layout de corte PRO (nesting)", async () =>
        runCutLayoutInWorker(settingsSnapshot, materialsSnapshot, pieces, {
          ...getDefaultCncLayoutOptions(nestingEngine),
          originTopRight: true,
          minUtilizationPercent: 0.92,
          rotationPreferenceMode: "aggressive",
          collectDiagnostics: true,
          sheetLargura_mm: sheetDef.largura_mm,
          sheetAltura_mm: sheetDef.altura_mm,
        })
      );
      if (result.diagnostics?.rejectedByLimit && result.diagnostics.rejectedByLimit.length > 0) {
        showToast(
          `Atenção: ${result.diagnostics.rejectedByLimit.length} peça(s) não couberam no layout e foram omitidas.`,
          "warning"
        );
      }

      // Cede controlo ao browser antes da geração do PDF
      await yieldToMainThread();
      const { buildCutLayoutPdf } = await import("../core/cutlayout/cutLayoutPdf");
      const doc = await buildCutLayoutPdf(result, {
        projectName: project.projectName ?? "Projeto",
        nestingTopRightOrigin: true,
      });
      const fileName = `${slug}_layout_corte_pro.pdf`;
      doc.save(fileName);
      showToast("Layout de Corte PRO gerado.", "info");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      devLogger.error("Layout de Corte PRO:", err);
      showToast(`Layout de Corte PRO: falha — ${msg}`, "error");
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
        const byMaterial = new Map<string, typeof allItems>();
        for (const item of allItems) {
          const key = (item.material ?? "Módulo").trim() || "Módulo";
          if (!byMaterial.has(key)) byMaterial.set(key, []);
          byMaterial.get(key)!.push(item);
        }

        const settingsSnapshot = getSettings();
        const materialsSnapshot = listMaterials();
        const cncProjectStub = { projectName: project.projectName ?? "Projeto" };

        const collectFiles = async (mode: "pro" | "fast"): Promise<Array<{ name: string; tcn: string; base: string }>> => {
          const rows: Array<{ name: string; tcn: string; base: string }> = [];
          const materialEntries = Array.from(byMaterial.entries());
          const startedAt = Date.now();
          const timeoutMs = 6000;
          for (let mi = 0; mi < materialEntries.length; mi++) {
            if (
              abortIndustrialLayoutRef.current ||
              Date.now() - startedAt > timeoutMs ||
              isMemoryPressureHigh()
            ) {
              const err = new Error("CutLayout aborted");
              err.name = "CutLayoutAbortedError";
              throw err;
            }
            const [materialName, itemsForMaterial] = materialEntries[mi]!;
            const safeMaterialName = materialName.replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_-]+/gu, "_") || "Sheet";
            const nestingEngine = (getSettings()?.nesting?.nestingEngine ?? "classic") as "classic" | "strip";
            const layoutOptionsBase =
              mode === "pro"
                ? getDefaultCncLayoutOptions(nestingEngine)
                : getFastCncLayoutOptions(nestingEngine);
            const basePct = (mi / Math.max(1, materialEntries.length)) * 100;
            setLayoutProgress((prev) => ({
              ...prev,
              visible: true,
              mode,
              percent: Math.max(prev.percent, Math.min(99, basePct + 50 / Math.max(1, materialEntries.length))),
              message: "Gerando layout industrial otimizado… aguarde.",
            }));
            const cncBundle = await buildCncFromCutlistItemsInWorker(
              settingsSnapshot,
              materialsSnapshot,
              cncProjectStub,
              itemsForMaterial,
              layoutOptionsBase
            );
            if (!cncBundle) continue;
            const cnc = cncBundle.cnc;
            for (const file of cnc.files) {
              const base = cnc.files.length === 1 ? safeMaterialName : `${safeMaterialName}_${file.panelIndex}`;
              rows.push({
                name: `${base}_cnc_${tcnSuffix}.tcn`,
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
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Falha na exportação CNC: ${msg}`, "error");
      setLayoutProgress({ visible: false, percent: 0, message: "", mode: "pro" });
    } finally {
      try {
        viewerSync.setUltraPerformanceMode(false);
      } catch {
        /* ignore */
      }
      endIndustrialFileGeneration();
    }
  }, [hasBoxes, showToast, project, boxes, tcnSuffix, viewerSync]);

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
    try {
      if (!hasBoxes) {
        showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
        return;
      }

      beginIndustrialFileGeneration();
      try {
        viewerSync.setUltraPerformanceMode(true);
      } catch {
        /* ignore */
      }

      await measureTime("Arquivo completo (ZIP)", async () => {
      type StepError = { step: string; message?: string; error?: string; detail?: string };
      const errors: StepError[] = [];
      const zip = new JSZip();
      const proj = pdfProject();

      const allItems = buildCutlistItemsForIndustrialExport({
        boxes,
        rules: project.rules,
        materialId: project.materialId,
        projectName: project.projectName,
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

      // --- Nesting (calculado uma vez; partilhado por Etiquetas + Layout de Corte PRO) ---
      let nestingResult: CutLayoutResult | null = null;
      try {
        const pieces = cutlistToPieces(allItems as CutlistItemForPieces[], {
          projectName: project.projectName ?? "Projeto",
          boxes: proj.boxes ?? boxes,
        });
        if (pieces.length > 0) {
          showCutLayoutLoader();
          await yieldToMainThread();
          const sheetDefNest = getSheetDefinitionFromSettings();
          const nestingEngine = (getSettings()?.nesting?.nestingEngine ?? "classic") as "classic" | "strip";
          nestingResult = await runCutLayoutInWorker(settingsSnapshot, materialsSnapshot, pieces, {
            ...getDefaultCncLayoutOptions(nestingEngine),
            originTopRight: true,
            sheetLargura_mm: sheetDefNest.largura_mm,
            sheetAltura_mm: sheetDefNest.altura_mm,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ step: "Nesting", message: msg });
        devLogger.error("Full export: Nesting", err);
      } finally {
        hideCutLayoutLoader();
      }

      // --- Etiquetas (ordenadas pela posição real no nesting) ---
      try {
        const nestingPlacements = nestingResult?.sheets.flatMap((s) => s.placements) ?? [];
        const designerConfig = hasStoredLabelDesignerConfig() ? loadLabelDesignerConfig() : undefined;
        const docEtiquetas = await buildEtiquetasPdf({
          ...proj,
          cutLayoutPlacements: nestingPlacements.length > 0 ? nestingPlacements : undefined,
          designerConfig,
        });
        if (!safeAddPdf(zip, `${safeSlug}_etiquetas.pdf`, docEtiquetas)) {
          errors.push({ step: "PDF Etiquetas", message: "Documento ou blob inválido." });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ step: "PDF Etiquetas", message: msg });
        devLogger.error("Full export: PDF Etiquetas", err);
      }

      // --- Layout de Corte PRO (reutiliza nesting calculado acima) ---
      try {
        if (nestingResult && nestingResult.sheets.length > 0) {
          const { buildCutLayoutPdf } = await import("../core/cutlayout/cutLayoutPdf");
          const docLayout = await buildCutLayoutPdf(nestingResult, {
            projectName: project.projectName ?? "Projeto",
            nestingTopRightOrigin: true,
          });
          if (!safeAddPdf(zip, `${safeSlug}_layout_corte_pro.pdf`, docLayout)) {
            errors.push({ step: "Layout de Corte PRO", message: "Falha ao adicionar PDF ao ZIP." });
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ step: "Layout de Corte PRO", message: msg });
        devLogger.error("Full export: Layout de Corte", err);
      }

      // --- CNC (TCN): um ficheiro por material (ex.: Madeira.tcn, Branco.tcn) ---
      try {
        const nestingEngine = (getSettings()?.nesting?.nestingEngine ?? "classic") as "classic" | "strip";
        const cncOptions = getDefaultCncLayoutOptions(nestingEngine);
        const byMaterial = new Map<string, typeof allItems>();
        for (const item of allItems) {
          const key = (item.material ?? "Módulo").trim() || "Módulo";
          if (!byMaterial.has(key)) byMaterial.set(key, []);
          byMaterial.get(key)!.push(item);
        }
        const usedTcnNamesByPath = new Set<string>();
        for (const [materialName, itemsForMaterial] of byMaterial) {
          const cncBundle = await buildCncFromCutlistItemsInWorker(
            settingsSnapshot,
            materialsSnapshot,
            cncProjectStub,
            itemsForMaterial as CutlistItemForPieces[],
            cncOptions
          );
          if (!cncBundle?.cnc?.files?.length) continue;
          const safeMaterialName = materialName.replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_-]+/gu, "_") || "Sheet";
          for (const file of cncBundle.cnc.files) {
            if (!file || file.tcn == null) {
              errors.push({
                step: "CNC",
                message: `Painel ${file?.panelIndex ?? "?"} sem TCN.`,
              });
              continue;
            }
            const thicknessBucket = formatThicknessBucket(file.thicknessMm);
            const base = cncBundle.cnc.files.length === 1 ? safeMaterialName : `${safeMaterialName}_${file.panelIndex}`;
            let finalBase = base;
            let dedupeIndex = 2;
            while (usedTcnNamesByPath.has(`cnc/${thicknessBucket}/tcn/${finalBase}`)) {
              finalBase = `${base}_${dedupeIndex}`;
              dedupeIndex += 1;
            }
            usedTcnNamesByPath.add(`cnc/${thicknessBucket}/tcn/${finalBase}`);

            const tcnPathFinal = sanitizeZipPath(`cnc/${thicknessBucket}/tcn/${finalBase}_cnc_${tcnSuffix}.tcn`);
            if (tcnPathFinal && typeof file.tcn === "string") {
              zip.file(tcnPathFinal, file.tcn);
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ step: "CNC (TCN)", message: msg });
        devLogger.error("Full export: CNC", err);
      }

      // --- DRILL (XML): um ficheiro por lateral ---
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

      // --- Gerar e descarregar ZIP ---
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

      if (errors.length > 0) {
        const first = errors[0];
        const detail = `${first.step}: ${first.message ?? first.error ?? "Erro desconhecido"}`;
        devLogger.error("Erro ao gerar arquivo completo:", errors);
        showToast(`Erro ao gerar arquivo completo — ${detail}`, "error");
      } else {
        showToast("Arquivo completo (ZIP) gerado.", "info");
      }
      });
    } catch (err) {
      devLogger.error("Arquivo completo: falha global", err);
      throw err;
    } finally {
      try {
        viewerSync.setUltraPerformanceMode(false);
      } catch {
        /* ignore */
      }
      endIndustrialFileGeneration();
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
