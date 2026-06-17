import type { PrintReadyDimensionEntry, PrintReadyDimensions } from "../../../3d/viewer-engine/overlays/boxDimensionsLayout";
import type { McDimensionsConfig } from "../../../config/mcDimensionsConfig";

type Vec3 = { x: number; y: number; z: number };

export type McDrawingLayout = {
  widthPx: number;
  heightPx: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  minXMm: number;
  maxXMm: number;
  minYMm: number;
  maxYMm: number;
};

const M_TO_MM = 1000;
const TICK_MM = 3;
const EXTENSION_OVERSHOOT_MM = 2;
const PNG_DPI_SCALE = 2;

function collectPoints(entries: PrintReadyDimensionEntry[]): Vec3[] {
  const pts: Vec3[] = [];
  for (const e of entries) {
    pts.push(
      e.featureStart3d,
      e.featureEnd3d,
      e.lineStart3d,
      e.lineEnd3d,
      e.position3d
    );
  }
  return pts;
}

/** Projeção frontal: X horizontal, Y vertical (m → mm). */
function toMm(p: Vec3): { x: number; y: number } {
  return { x: p.x * M_TO_MM, y: p.y * M_TO_MM };
}

export function computeMcDrawingLayout(
  data: PrintReadyDimensions,
  config: McDimensionsConfig,
  pixelDensity = 1
): McDrawingLayout | null {
  if (!data.entries.length) return null;

  const pts = collectPoints(data.entries).map(toMm);
  let minXMm = Infinity;
  let maxXMm = -Infinity;
  let minYMm = Infinity;
  let maxYMm = -Infinity;
  for (const p of pts) {
    minXMm = Math.min(minXMm, p.x);
    maxXMm = Math.max(maxXMm, p.x);
    minYMm = Math.min(minYMm, p.y);
    maxYMm = Math.max(maxYMm, p.y);
  }

  const contentWidthMm = Math.max(1, maxXMm - minXMm);
  const contentHeightMm = Math.max(1, maxYMm - minYMm);
  const margin = config.marginMm;

  const pageWidthMm = contentWidthMm + margin * 2;
  const pageHeightMm = contentHeightMm + margin * 2;

  const pxPerMm = 3.78 * pixelDensity;
  const widthPx = Math.ceil(pageWidthMm * pxPerMm);
  const heightPx = Math.ceil(pageHeightMm * pxPerMm);

  let scale = config.baseScale > 0 ? config.baseScale * pxPerMm : 0;
  if (scale <= 0) {
    const innerW = widthPx - margin * 2 * pxPerMm;
    const innerH = heightPx - margin * 2 * pxPerMm;
    const sx = innerW / contentWidthMm;
    const sy = innerH / contentHeightMm;
    scale = Math.min(sx, sy);
  }

  const offsetX = margin * pxPerMm - minXMm * scale;
  const offsetY = heightPx - margin * pxPerMm + minYMm * scale;

  return {
    widthPx,
    heightPx,
    scale,
    offsetX,
    offsetY,
    minXMm,
    maxXMm,
    minYMm,
    maxYMm,
  };
}

export function projectMcPoint(p: Vec3, layout: McDrawingLayout): { x: number; y: number } {
  const mm = toMm(p);
  return {
    x: layout.offsetX + mm.x * layout.scale,
    y: layout.offsetY - mm.y * layout.scale,
  };
}

function svgEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function drawDimensionOnCanvas(
  ctx: CanvasRenderingContext2D,
  entry: PrintReadyDimensionEntry,
  layout: McDrawingLayout,
  config: McDimensionsConfig
): void {
  const fs = entry.featureStart3d;
  const fe = entry.featureEnd3d;
  const ls = entry.lineStart3d;
  const le = entry.lineEnd3d;

  const pFs = projectMcPoint(fs, layout);
  const pFe = projectMcPoint(fe, layout);
  const pLs = projectMcPoint(ls, layout);
  const pLe = projectMcPoint(le, layout);
  const pLabel = projectMcPoint(entry.position3d, layout);

  const lw = config.lineWidthPx;
  ctx.strokeStyle = config.lineColor;
  ctx.fillStyle = config.lineColor;
  ctx.lineWidth = lw;

  // Linhas de extensão
  ctx.beginPath();
  ctx.moveTo(pFs.x, pFs.y);
  ctx.lineTo(pLs.x, pLs.y);
  ctx.moveTo(pFe.x, pFe.y);
  ctx.lineTo(pLe.x, pLe.y);
  ctx.stroke();

  // Linha de cota
  ctx.beginPath();
  ctx.moveTo(pLs.x, pLs.y);
  ctx.lineTo(pLe.x, pLe.y);
  ctx.stroke();

  // Ticks nas extremidades
  const tick = TICK_MM * layout.scale * 0.15;
  const dx = pLe.x - pLs.x;
  const dy = pLe.y - pLs.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (const p of [pLs, pLe]) {
    ctx.beginPath();
    ctx.moveTo(p.x - nx * tick, p.y - ny * tick);
    ctx.lineTo(p.x + nx * tick, p.y + ny * tick);
    ctx.stroke();
  }

  // Label
  const fontPx = Math.max(8, config.textSizePt * 1.33);
  ctx.font = `${fontPx}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = config.lineColor;
  ctx.fillText(entry.text, pLabel.x, pLabel.y);
}

function dimensionSvgFragment(
  entry: PrintReadyDimensionEntry,
  layout: McDrawingLayout,
  config: McDimensionsConfig
): string {
  const pFs = projectMcPoint(entry.featureStart3d, layout);
  const pFe = projectMcPoint(entry.featureEnd3d, layout);
  const pLs = projectMcPoint(entry.lineStart3d, layout);
  const pLe = projectMcPoint(entry.lineEnd3d, layout);
  const pLabel = projectMcPoint(entry.position3d, layout);
  const tick = TICK_MM * layout.scale * 0.15;
  const dx = pLe.x - pLs.x;
  const dy = pLe.y - pLs.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const fontPx = Math.max(8, config.textSizePt * 1.33);
  const stroke = config.lineColor;
  const sw = config.lineWidthPx;

  const tickLines = [pLs, pLe]
    .map(
      (p) =>
        `<line x1="${p.x - nx * tick}" y1="${p.y - ny * tick}" x2="${p.x + nx * tick}" y2="${p.y + ny * tick}" stroke="${stroke}" stroke-width="${sw}"/>`
    )
    .join("");

  return `
    <g class="mc-dim" data-axis="${entry.axis}">
      <line x1="${pFs.x}" y1="${pFs.y}" x2="${pLs.x}" y2="${pLs.y}" stroke="${stroke}" stroke-width="${sw}"/>
      <line x1="${pFe.x}" y1="${pFe.y}" x2="${pLe.x}" y2="${pLe.y}" stroke="${stroke}" stroke-width="${sw}"/>
      <line x1="${pLs.x}" y1="${pLs.y}" x2="${pLe.x}" y2="${pLe.y}" stroke="${stroke}" stroke-width="${sw}"/>
      ${tickLines}
      <text x="${pLabel.x}" y="${pLabel.y}" fill="${stroke}" font-size="${fontPx}" font-family="Arial,sans-serif" text-anchor="middle" dominant-baseline="middle">${svgEscape(entry.text)}</text>
    </g>`;
}

export function buildMcSvgString(data: PrintReadyDimensions, config: McDimensionsConfig): string | null {
  const layout = computeMcDrawingLayout(data, config, 1);
  if (!layout) return null;

  const dims = data.entries.map((e) => dimensionSvgFragment(e, layout, config)).join("");

  const ext = EXTENSION_OVERSHOOT_MM * layout.scale * 0.1;
  void ext;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${layout.widthPx}" height="${layout.heightPx}" viewBox="0 0 ${layout.widthPx} ${layout.heightPx}">
  <rect width="100%" height="100%" fill="${config.backgroundColor}"/>
  <g id="mc-dimensions" stroke-linecap="square">
    ${dims}
  </g>
</svg>`;
}

export function drawMcToCanvas(
  ctx: CanvasRenderingContext2D,
  data: PrintReadyDimensions,
  config: McDimensionsConfig,
  pixelDensity = PNG_DPI_SCALE
): McDrawingLayout | null {
  const layout = computeMcDrawingLayout(data, config, pixelDensity);
  if (!layout) return null;

  ctx.fillStyle = config.backgroundColor;
  ctx.fillRect(0, 0, layout.widthPx, layout.heightPx);

  for (const entry of data.entries) {
    drawDimensionOnCanvas(ctx, entry, layout, config);
  }

  return layout;
}

export async function buildMcPngBlob(
  data: PrintReadyDimensions,
  config: McDimensionsConfig
): Promise<Blob | null> {
  const layoutProbe = computeMcDrawingLayout(data, config, PNG_DPI_SCALE);
  if (!layoutProbe) return null;

  const canvas = document.createElement("canvas");
  canvas.width = layoutProbe.widthPx;
  canvas.height = layoutProbe.heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  drawMcToCanvas(ctx, data, config, PNG_DPI_SCALE);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export { PNG_DPI_SCALE };
