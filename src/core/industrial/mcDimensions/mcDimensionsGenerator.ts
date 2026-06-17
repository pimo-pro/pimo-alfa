import { jsPDF } from "jspdf";
import type { PrintReadyDimensions } from "../../../3d/viewer-engine/overlays/boxDimensionsLayout";
import {
  loadMcDimensionsConfig,
  normalizeMcDimensionsConfig,
  type McDimensionsConfig,
} from "../../../config/mcDimensionsConfig";
import {
  buildMcSvgString,
  buildMcPngBlob,
  computeMcDrawingLayout,
  drawMcToCanvas,
  projectMcPoint,
} from "./mcDimensionsDrawing";

export type McZipFileEntry = {
  path: string;
  blob: Blob;
};

const MC_BASENAME = "mc-dimensions";

export function generateMCJson(
  dimensionsData: PrintReadyDimensions,
  config?: McDimensionsConfig
): Blob {
  const cfg = config ?? loadMcDimensionsConfig();
  const payload = {
    schema: "pimo-mc-dimensions-v1",
    generatedAt: dimensionsData.generatedAt || Date.now(),
    config: normalizeMcDimensionsConfig(cfg),
    dimensions: dimensionsData,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

export function generateMCSvg(
  dimensionsData: PrintReadyDimensions,
  config?: McDimensionsConfig
): Blob | null {
  const cfg = config ?? loadMcDimensionsConfig();
  const svg = buildMcSvgString(dimensionsData, cfg);
  if (!svg) return null;
  return new Blob([svg], { type: "image/svg+xml" });
}

export async function generateMCPng(
  dimensionsData: PrintReadyDimensions,
  config?: McDimensionsConfig
): Promise<Blob | null> {
  const cfg = config ?? loadMcDimensionsConfig();
  return buildMcPngBlob(dimensionsData, cfg);
}

export function generateMCPdf(
  dimensionsData: PrintReadyDimensions,
  config?: McDimensionsConfig
): Blob | null {
  const cfg = config ?? loadMcDimensionsConfig();
  const layout = computeMcDrawingLayout(dimensionsData, cfg, 1);
  if (!layout) return null;

  const widthMm = layout.widthPx / 3.78;
  const heightMm = layout.heightPx / 3.78;
  const orientation = widthMm > heightMm ? "landscape" : "portrait";

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: [Math.max(80, widthMm), Math.max(60, heightMm)],
  });

  const canvas = document.createElement("canvas");
  canvas.width = layout.widthPx;
  canvas.height = layout.heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  drawMcToCanvas(ctx, dimensionsData, cfg, 1);

  const imgData = canvas.toDataURL("image/png");
  doc.addImage(imgData, "PNG", 0, 0, widthMm, heightMm);

  const arr = doc.output("arraybuffer");
  const buffer = arr instanceof ArrayBuffer ? arr : new Uint8Array(arr).buffer;
  return new Blob([buffer], { type: "application/pdf" });
}

/**
 * Gera ficheiros MC conforme configuração admin e devolve entradas para o ZIP.
 */
export async function exportMCDimensionsForZip(
  dimensionsData: PrintReadyDimensions,
  config?: McDimensionsConfig
): Promise<McZipFileEntry[]> {
  const cfg = normalizeMcDimensionsConfig(config ?? loadMcDimensionsConfig());
  if (!cfg.enabled) return [];
  if (!dimensionsData.entries.length) return [];

  const files: McZipFileEntry[] = [];

  if (cfg.formats.json) {
    files.push({ path: `${MC_BASENAME}.json`, blob: generateMCJson(dimensionsData, cfg) });
  }

  if (cfg.formats.svg) {
    const svg = generateMCSvg(dimensionsData, cfg);
    if (svg) files.push({ path: `${MC_BASENAME}.svg`, blob: svg });
  }

  if (cfg.formats.png) {
    const png = await generateMCPng(dimensionsData, cfg);
    if (png) files.push({ path: `${MC_BASENAME}.png`, blob: png });
  }

  if (cfg.formats.pdf) {
    const pdf = generateMCPdf(dimensionsData, cfg);
    if (pdf) files.push({ path: `${MC_BASENAME}.pdf`, blob: pdf });
  }

  return files;
}

/** Utilitário para pré-visualização admin (SVG string). */
export function previewMcSvg(
  dimensionsData: PrintReadyDimensions,
  config?: McDimensionsConfig
): string | null {
  return buildMcSvgString(dimensionsData, config ?? loadMcDimensionsConfig());
}

export { projectMcPoint };
