import { useCallback } from "react";
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

function pdfToBlob(doc: { output: (type: string) => ArrayBuffer | Uint8Array }): Blob {
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

export function useGerarArquivoHandlers() {
  const { project } = useProject();
  useSettings();
  const { showToast } = useToast();
  const boxes = project.boxes ?? [];
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
      console.error("Erro ao gerar PDF de cutlist:", err);
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
      console.error("Erro ao gerar PDF unificado:", err);
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
      console.error("Erro ao gerar PDFs:", err);
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
      console.error("Erro ao gerar PDF de etiquetas:", err);
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
    doc.save(`${slug}_layout_corte_pro.pdf`);
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
    const cncBundle = buildCncFromCutlistItems(project, allItems);
    if (!cncBundle) {
      showToast("Nenhuma peça na cutlist para exportar CNC.", "warning");
      return;
    }
    const cnc = cncBundle.cnc;
    const urls: string[] = [];
    for (const file of cnc.files) {
      const fallbackPiece = file.filenameBase || `panel_${file.panelIndex}`;
      const sheetResult = cncBundle.layoutResult.sheets[file.panelIndex - 1];
      const semanticPieceName = getSheetSemanticPieceName(sheetResult?.placements, fallbackPiece);
      const base = buildIndustrialBaseName(slug, file.thicknessMm, semanticPieceName, fallbackPiece);
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
    try {
      const zip = new JSZip();
      const proj = pdfProject();

      const docCutlist = await buildCutlistPdf(proj);
      zip.file(`${slug}_cutlist.pdf`, pdfToBlob(docCutlist));

      const docTecnico = gerarPdfTecnicoCompleto(proj.boxes, proj.rules, proj.projectName, {
        materialId: proj.materialId,
      });
      zip.file(`${slug}_tecnico.pdf`, pdfToBlob(docTecnico));

      const docUnificado = await buildUnifiedPdf(proj);
      zip.file(`${slug}_unificado.pdf`, pdfToBlob(docUnificado));

      const docEtiquetas = await buildEtiquetasPdf(proj);
      zip.file(`${slug}_etiquetas.pdf`, pdfToBlob(docEtiquetas));

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
      if (pieces.length > 0) {
        const result = runCutLayout(pieces, getSheetDefinitionFromSettings(), {
          rotationPreferenceMode: "aggressive",
          rotationWeight: 0.8,
          rotationPenalty: 0.45,
        });
        const { buildCutLayoutPdf } = await import("../core/cutlayout/cutLayoutPdf");
        const docLayout = buildCutLayoutPdf(result);
        zip.file(`${slug}_layout_corte.pdf`, pdfToBlob(docLayout));
        zip.file(`${slug}_layout_corte_pro.pdf`, pdfToBlob(docLayout));
      }

      const cncBundle = buildCncFromCutlistItems(project, allItems);
      if (cncBundle) {
        const usedTcnNamesByPath = new Set<string>();
        const thicknessBucketsInCnc = new Set<string>();
        for (const file of cncBundle.cnc.files) {
          const fallbackPiece = file.filenameBase || `panel_${file.panelIndex}`;
          const sheetResult = cncBundle.layoutResult.sheets[file.panelIndex - 1];
          const semanticPieceName = getSheetSemanticPieceName(sheetResult?.placements, fallbackPiece);
          const thicknessBucket = formatThicknessBucket(file.thicknessMm);
          thicknessBucketsInCnc.add(thicknessBucket);
          const base = buildIndustrialBaseName(slug, file.thicknessMm, semanticPieceName, fallbackPiece);

          // Evita sobrescrever no ZIP quando várias chapas resultam no mesmo nome semântico.
          let finalBase = base;
          let dedupeIndex = 2;
          while (usedTcnNamesByPath.has(`cnc/${thicknessBucket}/tcn/${finalBase}`)) {
            finalBase = `${base}_${dedupeIndex}`;
            dedupeIndex += 1;
          }
          usedTcnNamesByPath.add(`cnc/${thicknessBucket}/tcn/${finalBase}`);

          zip.file(`cnc/${thicknessBucket}/tcn/${finalBase}.tcn`, file.tcn);
          zip.file(`cnc/${thicknessBucket}/tcn/${finalBase}.kdt`, file.kdt);
        }
        // Garante estrutura industrial completa por espessura, mesmo sem XML DRILL.
        for (const thicknessBucket of thicknessBucketsInCnc) {
          zip.folder(`cnc/${thicknessBucket}/drill`);
        }
      }

      const drillFiles = buildDrillFilesForProject(allItems, {
        projectName: project.projectName ?? "Projeto",
        boxes: project.boxes,
        rules: project.rules,
      });
      for (const f of drillFiles) {
        const thicknessBucket = formatThicknessBucket(f.thicknessMm);
        const fallbackPiece = f.filenameBase || "peca";
        const base = buildIndustrialBaseName(slug, f.thicknessMm, f.partName, fallbackPiece);
        zip.file(`cnc/${thicknessBucket}/drill/${base}.xml`, f.xml);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}_completo.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Arquivo completo (ZIP) gerado.", "info");
    } catch (err) {
      console.error("Erro ao gerar arquivo completo:", err);
      showToast("Erro ao gerar arquivo completo.", "error");
    }
  }, [
    hasBoxes,
    showToast,
    pdfProject,
    slug,
    boxes,
    project.rules,
    project.materialId,
    project.projectName,
    project.extractedPartsByBoxId,
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
