/**
 * Constrói trajetórias / contornos / furos VISUAIS a partir do layout V4.
 * Não invoca writer TCN «mo» nem pipelines CNC de produção.
 */

import type { V4Piece, V4Placement, V4Sheet } from "../../nesting-v4/nestingV4Types";
import { rotateHoles } from "../../nesting-v4/nestingV4Engine";
import type { LcaRules } from "../rules/layoutCorteAlfaRules";
import type {
  LcaSimulationStats,
  LcaVisualContour,
  LcaVisualHole,
  LcaVisualToolpath,
} from "../types";

function pieceDims(piece: V4Piece): { w: number; h: number } {
  const rot = piece.rotation === 90 || piece.rotation === 270;
  return {
    w: rot ? piece.heightMm : piece.widthMm,
    h: rot ? piece.widthMm : piece.heightMm,
  };
}

function rectPath(x: number, y: number, w: number, h: number): string {
  return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

function offsetRectPath(x: number, y: number, w: number, h: number, off: number): string {
  return rectPath(x - off, y - off, w + off * 2, h + off * 2);
}

export function buildVisualSimulation(
  sheet: V4Sheet,
  pieces: V4Piece[],
  placements: V4Placement[],
  kerfMm: number,
  rules: LcaRules
): {
  contours: LcaVisualContour[];
  holes: LcaVisualHole[];
  toolpaths: LcaVisualToolpath[];
  stats: LcaSimulationStats;
} {
  const onSheet = placements.filter((p) => p.sheetIndex === sheet.index);
  const contours: LcaVisualContour[] = [];
  const holes: LcaVisualHole[] = [];
  const toolpaths: LcaVisualToolpath[] = [];
  let order = 1;
  let perimeterMm = 0;

  for (const pl of onSheet) {
    const piece = pieces.find((p) => p.id === pl.pieceId);
    if (!piece) continue;
    const { w, h } = pieceDims(piece);
    const x = pl.xMm;
    const y = pl.yMm;

    contours.push({
      pieceId: piece.id,
      pathD: rectPath(x, y, w, h),
      kind: "outer",
      order: order++,
    });
    contours.push({
      pieceId: piece.id,
      pathD: offsetRectPath(x, y, w, h, kerfMm * 0.5),
      kind: "kerf",
      order: order++,
    });

    const contourPts = [
      { xMm: x, yMm: y },
      { xMm: x + w, yMm: y },
      { xMm: x + w, yMm: y + h },
      { xMm: x, yMm: y + h },
      { xMm: x, yMm: y },
    ];
    toolpaths.push({
      pieceId: piece.id,
      points: contourPts,
      kind: "contour",
      order: order++,
    });
    perimeterMm += 2 * (w + h);

    const rot = (piece.rotation === 90 || piece.rotation === 270 ? 90 : 0) as 0 | 90 | 180 | 270;
    const rotated = rotateHoles(piece.originalHoles, rot, piece.widthMm, piece.heightMm);
    const drillPts: Array<{ xMm: number; yMm: number }> = [];
    for (const hole of rotated) {
      const hx = x + hole.x;
      const hy = y + hole.y;
      holes.push({
        pieceId: piece.id,
        xMm: hx,
        yMm: hy,
        diameterMm: hole.diameter,
        depthMm: hole.depth,
        holeType: hole.holeType,
        order: order++,
      });
      drillPts.push({ xMm: hx, yMm: hy });
    }
    if (drillPts.length > 0) {
      toolpaths.push({
        pieceId: piece.id,
        points: drillPts,
        kind: "drill",
        order: order++,
      });
    }
  }

  const sheetArea = Math.max(1, sheet.widthMm * sheet.heightMm);
  const usedArea = onSheet.reduce((sum, pl) => {
    const piece = pieces.find((p) => p.id === pl.pieceId);
    if (!piece) return sum;
    const { w, h } = pieceDims(piece);
    return sum + w * h;
  }, 0);
  const utilizationPercent = Math.min(100, (usedArea / sheetArea) * 100);
  const wastePercent = Math.max(0, 100 - utilizationPercent);
  const cutTimeSec = (perimeterMm / Math.max(1, rules.analysis.cutFeedMmPerMin)) * 60;
  const drillTimeSec = holes.length * rules.analysis.drillSecPerHole;

  return {
    contours,
    holes,
    toolpaths,
    stats: {
      utilizationPercent,
      wastePercent,
      pieceCount: onSheet.length,
      holeCount: holes.length,
      contourCount: contours.filter((c) => c.kind === "outer").length,
      cutTimeSec,
      drillTimeSec,
    },
  };
}

/** Relatório TCN visual — texto de simulação, não ficheiro industrial. */
export function buildVisualTcnReport(
  projectName: string,
  sheet: V4Sheet,
  pieces: V4Piece[],
  placements: V4Placement[],
  kerfMm: number,
  stats: LcaSimulationStats
): string {
  const lines: string[] = [
    "; ============================================",
    "; Layout de Corte Alfa — SIMULAÇÃO VISUAL",
    "; NÃO É FICHEIRO CNC DE PRODUÇÃO",
    "; Writer industrial nesting_mo NÃO é usado",
    "; ============================================",
    `; Projeto: ${projectName}`,
    `; Chapa: ${sheet.widthMm} x ${sheet.heightMm} x ${sheet.thicknessMm} mm`,
    `; Kerf visual: ${kerfMm} mm`,
    `; Origem máquina (simulação): canto superior direito`,
    `; Peças: ${stats.pieceCount} | Furos: ${stats.holeCount}`,
    `; Utilização: ${stats.utilizationPercent.toFixed(1)}% | Desperdício: ${stats.wastePercent.toFixed(1)}%`,
    `; Tempo corte (est. visual): ${stats.cutTimeSec.toFixed(1)} s`,
    `; Tempo furação (est. visual): ${stats.drillTimeSec.toFixed(1)} s`,
    ";",
  ];

  const onSheet = placements.filter((p) => p.sheetIndex === sheet.index);
  let op = 1;
  for (const pl of onSheet) {
    const piece = pieces.find((p) => p.id === pl.pieceId);
    if (!piece) continue;
    const { w, h } = pieceDims(piece);
    const machineX = sheet.widthMm - (pl.xMm + w);
    const machineY = pl.yMm;
    lines.push(`; OP${op++} PEÇA ${piece.name} id=${piece.id}`);
    lines.push(`;   dims ${w}x${h} rot=${piece.rotation} grain=${piece.industrialGrainCode ?? "-"}`);
    lines.push(`;   layout_xy=${pl.xMm.toFixed(1)},${pl.yMm.toFixed(1)} machine_xy=${machineX.toFixed(1)},${machineY.toFixed(1)}`);
    lines.push(`;   CONTOUR_RECT ${w} ${h}`);
    for (const hole of piece.originalHoles) {
      lines.push(`;   DRILL d=${hole.diameter} depth=${hole.depth} local=${hole.x},${hole.y}`);
    }
  }
  lines.push("; FIM SIMULAÇÃO");
  return lines.join("\n");
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
