import { useCallback, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { useProject } from "../context/useProject";
import { useToast } from "../context/ToastContext";
import { useSettings } from "../context/SettingsContext";
import { cutlistComPrecoFromBoxes } from "../core/manufacturing/cutlistFromBoxes";
import { gerarPdfTecnicoCompleto } from "../core/pdf/gerarPdfTecnico";
import { buildCutlistPdf } from "../core/pdf/pdfCutlist";
import { buildUnifiedPdf } from "../core/pdf/pdfUnified";
import { buildEtiquetasPdf } from "../core/pdf/pdfEtiquetas";
import { runCutLayout, cutlistToPieces, type CutlistItemForPieces } from "../core/cutlayout/cutLayoutEngine";
import {
  buildCncFromCutlistItems,
  getDefaultCncLayoutOptions,
  getFastCncLayoutOptions,
  getSheetDefinitionFromSettings,
} from "../core/cnc/cncPipeline";
import { buildDrillFilesForProject } from "../core/drill/drillExport";
import { devLogger } from "../utils/devLogger";
import { sanitizeZipPath } from "../utils/sanitization";

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
  console.log("Parts extraídas:", project.extractedPartsByBoxId);
  const cutlist = cutlistComPrecoFromBoxes(
    boxes as never[],
    project.rules as never,
    project.materialId,
    project.projectName
  );
  console.log("Cutlist:", cutlist);
  const extracted = boxes.flatMap((b) =>
    Object.values(project.extractedPartsByBoxId?.[b.id] ?? {}).flat()
  );
  const items = [...cutlist, ...extracted].map((p) => ({
    ...(p as Record<string, unknown>),
    boxId: (p as { boxId?: string }).boxId ?? "",
  }));
  console.log("Itens totais para CNC:", items.length);
  return items;
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
  const { project } = useProject();
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
    }),
    [project, boxes]
  );

  const cancelIndustrialLayout = useCallback(() => {
    abortIndustrialLayoutRef.current = true;
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
      const doc = await buildEtiquetasPdf(pdfProject());
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
    const parametric = cutlistComPrecoFromBoxes(
      boxes,
      project.rules,
      project.materialId,
      project.projectName
    );
    const extracted = boxes.flatMap((b) =>
      Object.values(project.extractedPartsByBoxId?.[b.id] ?? {}).flat()
    );
    const allItems = [...parametric, ...extracted].map((p) => ({
      ...p,
      boxId: p.boxId ?? "",
    }));
    const pieces = cutlistToPieces(allItems);
    if (pieces.length === 0) {
      showToast("Nenhuma peça na cutlist para o layout de corte.", "warning");
      return;
    }
    const result = runCutLayout(pieces, getSheetDefinitionFromSettings(), {
      ...getDefaultCncLayoutOptions(),
      originTopRight: true,
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
      const parametric = cutlistComPrecoFromBoxes(
        boxes,
        project.rules,
        project.materialId,
        project.projectName
      );
      const extracted = boxes.flatMap((b) =>
        Object.values(project.extractedPartsByBoxId?.[b.id] ?? {}).flat()
      );
      const allItems = [...parametric, ...extracted].map((p) => ({
        ...p,
        boxId: p.boxId ?? "",
      }));

      const pieces = cutlistToPieces(allItems);
      if (pieces.length === 0) {
        showToast("Nenhuma peça na cutlist para o layout de corte.", "warning");
        return;
      }

      const result = runCutLayout(pieces, getSheetDefinitionFromSettings(), {
        ...getDefaultCncLayoutOptions(),
        originTopRight: true,
      });
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
    }
  }, [
    hasBoxes,
    showToast,
    boxes,
    project,
    slug,
  ]);

  const onExportarCnc = useCallback(async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }
    showToast("Gerando layout industrial otimizado… aguarde.", "info");
    abortIndustrialLayoutRef.current = false;
    const forceFastMode = true; // temporário para diagnóstico
    setLayoutProgress({
      visible: true,
      percent: 1,
      message: forceFastMode
        ? "Modo rápido forçado ativo. Gerando layout estável…"
        : "Gerando layout industrial otimizado… aguarde.",
      mode: forceFastMode ? "fast" : "pro",
    });
    console.log("Projeto atual:", project);
    const allItems = buildItemsForCncExport(project, boxes) as CutlistItemForPieces[];
    const debugPieces = cutlistToPieces(allItems as never[]);
    console.log("[DEBUG] cutlist items:", allItems.length);
    console.log("[DEBUG] pieces:", debugPieces.length);
    console.log("[DEBUG] first piece:", debugPieces[0]);

    // Agrupar por material: cada material gera ficheiros TCN independentes (ex.: Madeira.tcn, Branco.tcn).
    const byMaterial = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const key = (item.material ?? "Módulo").trim() || "Módulo";
      if (!byMaterial.has(key)) byMaterial.set(key, []);
      byMaterial.get(key)!.push(item);
    }

    const collectFiles = (mode: "pro" | "fast"): Array<{ name: string; tcn: string; base: string }> => {
      const rows: Array<{ name: string; tcn: string; base: string }> = [];
      const materialEntries = Array.from(byMaterial.entries());
      const startedAt = Date.now();
      const timeoutMs = 6000;
      for (let mi = 0; mi < materialEntries.length; mi++) {
        const [materialName, itemsForMaterial] = materialEntries[mi];
        const safeMaterialName = materialName.replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_-]+/gu, "_") || "Sheet";
        const layoutOptions =
          mode === "pro"
            ? {
                ...getDefaultCncLayoutOptions(),
                shouldAbort: () =>
                  abortIndustrialLayoutRef.current ||
                  Date.now() - startedAt > timeoutMs ||
                  isMemoryPressureHigh(),
                onProgress: (event: { percent: number }) => {
                  const base = (mi / Math.max(1, materialEntries.length)) * 100;
                  const part = event.percent / Math.max(1, materialEntries.length);
                  setLayoutProgress((prev) => ({
                    ...prev,
                    visible: true,
                    mode: "pro",
                    percent: Math.max(prev.percent, Math.min(99, base + part)),
                    message: "Gerando layout industrial otimizado… aguarde.",
                  }));
                },
              }
            : getFastCncLayoutOptions();
        const cncBundle = buildCncFromCutlistItems(project, itemsForMaterial, undefined, layoutOptions);
        if (!cncBundle) continue;
        const cnc = cncBundle.cnc;
        for (const file of cnc.files) {
          const base = cnc.files.length === 1
            ? safeMaterialName
            : `${safeMaterialName}_${file.panelIndex}`;
          rows.push({
            name: `${base}_cnc_${tcnSuffix}.tcn`,
            tcn: file.tcn,
            base: file.filenameBase,
          });
        }
      }
      return rows;
    };

    try {
      let rows: Array<{ name: string; tcn: string; base: string }> = [];
      if (forceFastMode) {
        rows = collectFiles("fast");
      } else {
        try {
          rows = collectFiles("pro");
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
          rows = collectFiles("fast");
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
      console.log("Arquivos CNC coletados:", rows.length);
      setTimeout(() => urls.forEach((u) => URL.revokeObjectURL(u)), 500);
      setLayoutProgress({
        visible: true,
        percent: 100,
        message: "Layout concluído. A transferir ficheiros…",
        mode: forceFastMode || abortIndustrialLayoutRef.current ? "fast" : "pro",
      });
      setTimeout(() => {
        setLayoutProgress({ visible: false, percent: 0, message: "", mode: "pro" });
      }, 700);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Falha na exportação CNC: ${msg}`, "error");
      setLayoutProgress({ visible: false, percent: 0, message: "", mode: "pro" });
    }
  }, [hasBoxes, showToast, project, boxes, tcnSuffix]);

  /** Gera todos os arquivos disponíveis, coloca numa pasta (ZIP) e descarrega. */
  const onArquivoCompleto = useCallback(async () => {
    console.log("[GEN] Entrou no gerarArquivoCompleto");
    try {
      if (!hasBoxes) {
        showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
        return;
      }

      type StepError = { step: string; message?: string; error?: string; detail?: string };
      const errors: StepError[] = [];
      const zip = new JSZip();
      const proj = pdfProject();

      console.log("[GEN] Preparando cutlist...");
      const parametric = cutlistComPrecoFromBoxes(
        boxes,
        project.rules,
        project.materialId,
        project.projectName
      );
      console.log("[GEN] Cutlist gerado:", parametric?.length);
      const extracted = boxes.flatMap((b) =>
        Object.values(project.extractedPartsByBoxId?.[b.id] ?? {}).flat()
      );
      const allItems = [...parametric, ...extracted].map((p) => ({
        ...p,
        boxId: p.boxId ?? "",
      }));

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

      // --- Etiquetas ---
      try {
        const docEtiquetas = await buildEtiquetasPdf(proj);
        if (!safeAddPdf(zip, `${safeSlug}_etiquetas.pdf`, docEtiquetas)) {
          errors.push({ step: "PDF Etiquetas", message: "Documento ou blob inválido." });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ step: "PDF Etiquetas", message: msg });
        devLogger.error("Full export: PDF Etiquetas", err);
      }

      // --- Layout de Corte (e Layout de Corte PRO) ---
      try {
        const pieces = cutlistToPieces(allItems);
        if (pieces.length > 0) {
          const result = runCutLayout(pieces, getSheetDefinitionFromSettings(), {
            ...getDefaultCncLayoutOptions(),
            originTopRight: true,
          });
          const { buildCutLayoutPdf } = await import("../core/cutlayout/cutLayoutPdf");
          const docLayout = await buildCutLayoutPdf(result, {
            projectName: project.projectName ?? "Projeto",
            nestingTopRightOrigin: true,
          });
          const addedPro = safeAddPdf(zip, `${safeSlug}_layout_corte_pro.pdf`, docLayout);
          if (!addedPro) {
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
        console.log("[GEN] Montando opções do CNC...");
        const cncOptions = getDefaultCncLayoutOptions();
        console.log("[GEN] cncOptions:", cncOptions);
        const byMaterial = new Map<string, typeof allItems>();
        for (const item of allItems) {
          const key = (item.material ?? "Módulo").trim() || "Módulo";
          if (!byMaterial.has(key)) byMaterial.set(key, []);
          byMaterial.get(key)!.push(item);
        }
        const usedTcnNamesByPath = new Set<string>();
        for (const [materialName, itemsForMaterial] of byMaterial) {
          console.log("[GEN] Chamando buildCncFromCutlistItems...");
          const cncBundle = buildCncFromCutlistItems(project, itemsForMaterial, undefined, cncOptions);
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
    } catch (err) {
      console.error("[GEN-ERROR] Erro antes do CNC:", err);
      throw err;
    }
  }, [
    hasBoxes,
    showToast,
    pdfProject,
    slug,
    boxes,
    project,
    tcnSuffix,
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
  };
}
