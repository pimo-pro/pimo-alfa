import { useCallback, useMemo } from "react";
import JSZip from "jszip";
import { useProject } from "../context/useProject";
import { useToast } from "../context/ToastContext";
import { useSettings } from "../context/SettingsContext";
import { cutlistComPrecoFromBoxes } from "../core/manufacturing/cutlistFromBoxes";
import { gerarPdfTecnicoCompleto } from "../core/pdf/gerarPdfTecnico";
import { buildCutlistPdf } from "../core/pdf/pdfCutlist";
import { buildUnifiedPdf } from "../core/pdf/pdfUnified";
import { buildEtiquetasPdf } from "../core/pdf/pdfEtiquetas";
import { runCutLayout, cutlistToPieces } from "../core/cutlayout/cutLayoutEngine";
import {
  buildCncFromCutlistItems,
  getSheetDefinitionFromSettings,
} from "../core/cnc/cncPipeline";
import { buildDrillFilesForProject } from "../core/drill/drillExport";
import { devLogger } from "../utils/devLogger";

function pdfToBlob(doc: { output: (_type: string) => ArrayBuffer | Uint8Array }): Blob {
  const arr = doc.output("arraybuffer");
  const buffer = arr instanceof ArrayBuffer ? arr : new Uint8Array(arr).buffer;
  return new Blob([buffer], { type: "application/pdf" });
}

function sanitizeIndustrialToken(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "item";
}

function formatThicknessBucket(thicknessMm: number): string {
  if (!Number.isFinite(thicknessMm) || thicknessMm <= 0) return "0mm";
  const rounded = Math.round(thicknessMm * 100) / 100;
  const label = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", "_");
  return `${label}mm`;
}

function buildIndustrialBaseName(
  projectSlug: string,
  thicknessMm: number,
  pieceName: string,
  fallbackName: string
): string {
  const safeSlug = sanitizeIndustrialToken(projectSlug);
  const safePieceName = sanitizeIndustrialToken(pieceName || fallbackName);
  const safeThickness = formatThicknessBucket(thicknessMm);
  return `${safeSlug}_${safeThickness}_${safePieceName}`;
}

function getSheetSemanticPieceName(
  placements: Array<{ partName?: string }> | undefined,
  fallbackName: string
): string {
  const uniqueNames = Array.from(
    new Set(
      (placements ?? [])
        .map((p) => (typeof p.partName === "string" ? p.partName.trim() : ""))
        .filter((name) => name.length > 0)
    )
  );

  if (uniqueNames.length === 1) return uniqueNames[0];
  if (uniqueNames.length > 1) return `${uniqueNames[0]}_mix_${uniqueNames.length}_pecas`;
  return fallbackName;
}

/** Sanitiza um path/nome para entrada no ZIP: sem caracteres inválidos, sem segmentos vazios. */
function sanitizeZipPath(path: string): string {
  if (typeof path !== "string" || path.trim() === "") return "ficheiro";
  const sanitizeSegment = (segment: string): string =>
    Array.from(segment)
      .map((char) => {
        const code = char.charCodeAt(0);
        if (code < 32 || "<>:\"|?*".includes(char)) return "_";
        return char;
      })
      .join("");

  return path
    .replace(/\\/g, "/")
    .split("/")
    .map((seg) =>
      sanitizeSegment(seg)
        .replace(/\s+/g, "_")
        .replace(/^\.+/, "")
        .trim()
    )
    .filter((s) => s.length > 0)
    .join("/") || "ficheiro";
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
  useSettings();
  const { showToast } = useToast();
  const boxes = useMemo(() => project.boxes ?? [], [project.boxes]);
  const hasBoxes = boxes.length > 0;
  const slug =
    (project.projectName || "projeto")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s+/g, "_") || "projeto";

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
      rotationPreferenceMode: "aggressive",
      rotationWeight: 0.8,
      rotationPenalty: 0.45,
    });
    const { buildCutLayoutPdf } = await import(
      "../core/cutlayout/cutLayoutPdf"
    );
    const doc = buildCutLayoutPdf(result);
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
        rotationPreferenceMode: "aggressive",
        rotationWeight: 0.8,
        rotationPenalty: 0.45,
      });
      const { buildCutLayoutPdf } = await import("../core/cutlayout/cutLayoutPdf");
      const doc = buildCutLayoutPdf(result);
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

    // Agrupar por material: cada material gera ficheiros TCN independentes (ex.: Madeira.tcn, Branco.tcn).
    const byMaterial = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const key = (item.material ?? "Módulo").trim() || "Módulo";
      if (!byMaterial.has(key)) byMaterial.set(key, []);
      byMaterial.get(key)!.push(item);
    }

    const urls: string[] = [];
    for (const [materialName, itemsForMaterial] of byMaterial) {
      const cncBundle = buildCncFromCutlistItems(project, itemsForMaterial);
      if (!cncBundle) continue;
      const cnc = cncBundle.cnc;
      const safeMaterialName = materialName.replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_-]+/gu, "_") || "Sheet";
      for (const file of cnc.files) {
        const base = cnc.files.length === 1
          ? safeMaterialName
          : `${safeMaterialName}_${file.panelIndex}`;
        const tcnBlob = new Blob([file.tcn], { type: "text/plain" });
        const kdtBlob = new Blob([file.kdt], { type: "text/xml" });
        const tcnUrl = URL.createObjectURL(tcnBlob);
        const kdtUrl = URL.createObjectURL(kdtBlob);
        urls.push(tcnUrl, kdtUrl);
        const link1 = document.createElement("a");
        link1.href = tcnUrl;
        link1.download = `${base}.tcn`;
        link1.click();
        const link2 = document.createElement("a");
        link2.href = kdtUrl;
        link2.download = `${base}.kdt`;
        link2.click();
      }
    }
    if (urls.length === 0) {
      showToast("Nenhuma peça na cutlist para exportar CNC.", "warning");
      return;
    }
    setTimeout(() => urls.forEach((u) => URL.revokeObjectURL(u)), 500);
  }, [
    hasBoxes,
    showToast,
    project,
    boxes,
    slug,
  ]);

  /** Gera todos os arquivos disponíveis, coloca numa pasta (ZIP) e descarrega. */
  const onArquivoCompleto = useCallback(async () => {
    if (!hasBoxes) {
      showToast("Nenhuma caixa no projeto. Gere o design primeiro.", "warning");
      return;
    }

    type StepError = { step: string; message: string; detail?: string };
    const errors: StepError[] = [];
    const zip = new JSZip();
    const proj = pdfProject();

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
          rotationPreferenceMode: "aggressive",
          rotationWeight: 0.8,
          rotationPenalty: 0.45,
        });
        const { buildCutLayoutPdf } = await import("../core/cutlayout/cutLayoutPdf");
        const docLayout = buildCutLayoutPdf(result);
        const addedLayout = safeAddPdf(zip, `${safeSlug}_layout_corte.pdf`, docLayout);
        const addedPro = safeAddPdf(zip, `${safeSlug}_layout_corte_pro.pdf`, docLayout);
        if (!addedLayout || !addedPro) {
          errors.push({ step: "Layout de Corte PRO", message: "Falha ao adicionar PDF ao ZIP." });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ step: "Layout de Corte PRO", message: msg });
      devLogger.error("Full export: Layout de Corte", err);
    }

    // --- CNC (TCN + KDT): um ficheiro por material (ex.: Madeira.tcn, Branco.tcn) ---
    try {
      const byMaterial = new Map<string, typeof allItems>();
      for (const item of allItems) {
        const key = (item.material ?? "Módulo").trim() || "Módulo";
        if (!byMaterial.has(key)) byMaterial.set(key, []);
        byMaterial.get(key)!.push(item);
      }
      const usedTcnNamesByPath = new Set<string>();
      const thicknessBucketsInCnc = new Set<string>();
      for (const [materialName, itemsForMaterial] of byMaterial) {
        const cncBundle = buildCncFromCutlistItems(project, itemsForMaterial);
        if (!cncBundle?.cnc?.files?.length) continue;
        const safeMaterialName = materialName.replace(/\s+/g, "_").replace(/[^\p{L}\p{N}_-]+/gu, "_") || "Sheet";
        for (const file of cncBundle.cnc.files) {
          if (!file || file.tcn == null || file.kdt == null) {
            errors.push({
              step: "CNC",
              message: `Painel ${file?.panelIndex ?? "?"} sem TCN ou KDT.`,
            });
            continue;
          }
          const thicknessBucket = formatThicknessBucket(file.thicknessMm);
          thicknessBucketsInCnc.add(thicknessBucket);
          const base = cncBundle.cnc.files.length === 1 ? safeMaterialName : `${safeMaterialName}_${file.panelIndex}`;
          let finalBase = base;
          let dedupeIndex = 2;
          while (usedTcnNamesByPath.has(`cnc/${thicknessBucket}/tcn/${finalBase}`)) {
            finalBase = `${base}_${dedupeIndex}`;
            dedupeIndex += 1;
          }
          usedTcnNamesByPath.add(`cnc/${thicknessBucket}/tcn/${finalBase}`);

          const tcnPathFinal = sanitizeZipPath(`cnc/${thicknessBucket}/tcn/${finalBase}.tcn`);
          const kdtPathFinal = sanitizeZipPath(`cnc/${thicknessBucket}/tcn/${finalBase}.kdt`);
          if (tcnPathFinal && typeof file.tcn === "string") {
            zip.file(tcnPathFinal, file.tcn);
          }
          if (kdtPathFinal && typeof file.kdt === "string") {
            zip.file(kdtPathFinal, file.kdt);
          }
        }
      }
      for (const thicknessBucket of thicknessBucketsInCnc) {
        const folderPath = sanitizeZipPath(`cnc/${thicknessBucket}/drill`);
        if (folderPath) zip.folder(folderPath);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ step: "CNC (TCN/KDT)", message: msg });
      devLogger.error("Full export: CNC", err);
    }

    // --- DRILL (XML) ---
    try {
      const drillFiles = buildDrillFilesForProject(allItems, {
        projectName: project.projectName ?? "Projeto",
        boxes: project.boxes,
        rules: project.rules,
      });
      for (let i = 0; i < drillFiles.length; i++) {
        const f = drillFiles[i];
        if (!f || typeof f.xml !== "string") {
          errors.push({ step: "DRILL", message: `Ficheiro DRILL ${i + 1} sem conteúdo XML.` });
          continue;
        }
        const thicknessBucket = formatThicknessBucket(f.thicknessMm);
        const fallbackPiece = f.filenameBase || "peca";
        const base = buildIndustrialBaseName(slug, f.thicknessMm, f.partName, fallbackPiece);
        const path = sanitizeZipPath(`cnc/${thicknessBucket}/drill/${base}.xml`);
        if (path) zip.file(path, f.xml);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ step: "DRILL (XML)", message: msg });
      devLogger.error("Full export: DRILL", err);
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
      const detail = `${first.step}: ${first.message}`;
      devLogger.error("Erro ao gerar arquivo completo:", errors);
      showToast(`Erro ao gerar arquivo completo — ${detail}`, "error");
    } else {
      showToast("Arquivo completo (ZIP) gerado.", "info");
    }
  }, [
    hasBoxes,
    showToast,
    pdfProject,
    slug,
    boxes,
    project,
  ]);

  return {
    hasBoxes,
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
