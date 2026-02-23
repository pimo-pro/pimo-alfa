/**
 * Motor de Layout de Corte PRO — nesting engine real.
 *
 * Algoritmo: Skyline (contorno superior) + bottom-left.
 * - Posições candidatas X: origem e cada início de segmento do skyline.
 * - Y por candidato: altura máxima do skyline no intervalo [x, x+largura].
 * - Rotação 90° quando não há restrição de veio (grain).
 * - Colisão com kerf; escolha da posição válida mais baixa e mais à esquerda.
 * - Preenche espaços antes de abrir nova chapa; minimiza desperdício e número de chapas.
 */

import type {
  CutPiece,
  CutPlacement,
  SheetDefinition,
  SheetResult,
  CutLayoutResult,
} from "./cutLayoutTypes";
import type { LayoutVisualMaterial } from "../types";

const DEFAULT_KERF_MM = 3;
const MIN_UTILIZATION_PERCENT = 0.8;
const MAIN_SEARCH_WINDOW = 24;
const DEFAULT_ROTATION_WEIGHT = 0.35;
const DEFAULT_ROTATION_PENALTY = 0.25;
const DEFAULT_ROTATION_MODE: RotationPreferenceMode = "auto";

/** Retângulo já colocado na chapa. */
type PlacedRect = { x: number; y: number; w: number; h: number };

/** Segmento do skyline: em [x, próximo x) a altura do contorno é y. */
type SkylineSegment = { x: number; y: number };
type RotationPreferenceMode = "auto" | "aggressive" | "disabled";

export type CutLayoutEngineOptions = {
  sheetLargura_mm?: number;
  sheetAltura_mm?: number;
  kerf_mm?: number;
  minUtilizationPercent?: number;
  /** Recompensa explícita para usar rotação quando melhora encaixe. */
  rotationWeight?: number;
  /** Penalidade para não rotacionar quando a rotação era superior. */
  rotationPenalty?: number;
  /** auto = balanceado, aggressive = prioriza rotação, disabled = sem rotação. */
  rotationPreferenceMode?: RotationPreferenceMode;
  /** Habilita coleta de diagnósticos de nesting (rejeições e gap-fill). */
  collectDiagnostics?: boolean;
  /** Agrupar apenas por espessura (nesting global por espessura, todas as peças/modelos juntos). */
  groupByThicknessOnly?: boolean;
};

/** Item de cutlist com campos opcionais de material/UV (Layout Engine). */
export type CutlistItemForPieces = {
  dimensoes: { largura: number; altura: number; profundidade: number };
  espessura: number;
  quantidade: number;
  boxId?: string;
  nome: string;
  material?: string;
  materialId?: string;
  grainDirection?: "length" | "width" | "horizontal" | "vertical" | "none";
  visualMaterial?: LayoutVisualMaterial;
  uvScaleOverride?: { x: number; y: number };
  uvRotationOverride?: number;
};

/**
 * Converte cutlist em peças 2D (face = duas maiores dimensões em mm).
 * Garante dimensões reais por peça: largura e altura são as duas maiores dimensões do item, em mm.
 */
export function cutlistToPieces(items: CutlistItemForPieces[]): CutPiece[] {
  return items.flatMap((item) => {
    const raw = [
      Number(item.dimensoes?.largura) || 0,
      Number(item.dimensoes?.altura) || 0,
      Number(item.dimensoes?.profundidade) || 0,
    ].filter((n) => Number.isFinite(n) && n > 0);
    const dims = raw.length >= 2
      ? [...raw].sort((a, b) => b - a)
      : [Math.max(raw[0] ?? 1, 1), 1];
    const largura = Math.round(Math.max(dims[0] ?? 1, 1));
    const altura = Math.round(Math.max(dims[1] ?? 1, 1));
    const esp = item.espessura ?? 19;
    const g = item.grainDirection;
    const grainDirection: "length" | "width" | undefined =
      g === "length" || g === "width" ? g : g === "horizontal" ? "length" : g === "vertical" ? "width" : undefined;
    const pieces: CutPiece[] = [];
    const qty = Math.max(1, Number(item.quantidade) || 1);
    for (let i = 0; i < qty; i++) {
      pieces.push({
        largura_mm: largura,
        altura_mm: altura,
        espessura_mm: Number(esp) || 19,
        quantidade: 1,
        boxId: item.boxId ?? "",
        partName: item.nome,
        materialId: item.materialId ?? item.material,
        materialName: item.material,
        grainDirection,
        visualMaterial: item.visualMaterial,
        uvScaleOverride: item.uvScaleOverride,
        uvRotationOverride: item.uvRotationOverride,
      });
    }
    return pieces;
  });
}

function expandPieces(pieces: CutPiece[]): CutPiece[] {
  const out: CutPiece[] = [];
  for (const p of pieces) {
    for (let i = 0; i < (p.quantidade ?? 1); i++) {
      out.push({ ...p, quantidade: 1 });
    }
  }
  return out;
}

function groupByMaterialAndThickness(pieces: CutPiece[]): Map<string, CutPiece[]> {
  const map = new Map<string, CutPiece[]>();
  for (const p of pieces) {
    const key = `${p.materialId ?? "material"}|${p.espessura_mm}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return map;
}

/** Agrupa apenas por espessura (para CNC: um nesting global por espessura, todas as peças). */
function groupByThicknessOnly(pieces: CutPiece[]): Map<string, CutPiece[]> {
  const map = new Map<string, CutPiece[]>();
  for (const p of pieces) {
    const key = String(p.espessura_mm);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return map;
}

function getPieceArea(piece: CutPiece): number {
  return Math.max(1, piece.largura_mm * piece.altura_mm);
}

function getPieceAspectRatio(piece: CutPiece): number {
  const a = Math.max(piece.largura_mm, piece.altura_mm);
  const b = Math.max(1, Math.min(piece.largura_mm, piece.altura_mm));
  return a / b;
}

type ReorderMode = "production" | "gapFill";
const isRotatablePiece = (piece: CutPiece): boolean =>
  !piece.grainDirection && piece.largura_mm !== piece.altura_mm;

/**
 * Reordena peças para produção:
 * 1) materialId, 2) área desc, 3) razão largura/altura desc.
 * Para gap-filling, prioriza peças menores para preencher vazios.
 */
function reorderPieces(pieces: CutPiece[], mode: ReorderMode = "production"): CutPiece[] {
  return [...pieces].sort((a, b) => {
    if (mode === "production") {
      const matA = a.materialId ?? "";
      const matB = b.materialId ?? "";
      if (matA !== matB) return matA.localeCompare(matB);
      const areaDiff = getPieceArea(b) - getPieceArea(a);
      if (areaDiff !== 0) return areaDiff;
      return getPieceAspectRatio(b) - getPieceAspectRatio(a);
    }
    const rotDiff = Number(isRotatablePiece(b)) - Number(isRotatablePiece(a));
    if (rotDiff !== 0) return rotDiff;
    const areaDiff = getPieceArea(a) - getPieceArea(b);
    if (areaDiff !== 0) return areaDiff;
    return getPieceAspectRatio(b) - getPieceAspectRatio(a);
  });
}

/**
 * Utilização da chapa em [0..1], considerando área útil ocupada por peças.
 */
function calculateSheetUtilization(
  placedRects: PlacedRect[],
  sheetW: number,
  sheetH: number
): number {
  const sheetArea = Math.max(1, sheetW * sheetH);
  const usedArea = placedRects.reduce((acc, r) => acc + r.w * r.h, 0);
  return usedArea / sheetArea;
}

function isInsideSheet(
  x: number,
  y: number,
  w: number,
  h: number,
  sheet: SheetDefinition
): boolean {
  const eps = 0.001;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) return false;
  if (w <= 0 || h <= 0) return false;
  if (x < -eps || y < -eps) return false;
  if (x + w > sheet.largura_mm + eps) return false;
  if (y + h > sheet.altura_mm + eps) return false;
  return true;
}

/**
 * Skyline: retorna a altura máxima do contorno no intervalo [xStart, xStart + width).
 */
function getSkylineHeight(skyline: SkylineSegment[], xStart: number, width: number): number {
  const xEnd = xStart + width;
  let maxY = 0;
  for (let i = 0; i < skyline.length - 1; i++) {
    const segStart = skyline[i].x;
    const segEnd = skyline[i + 1].x;
    if (segEnd <= xStart || segStart >= xEnd) continue;
    maxY = Math.max(maxY, skyline[i].y);
  }
  return maxY;
}

/** Altura do skyline num ponto x (segmento que contém x). */
function getSkylineYAt(skyline: SkylineSegment[], x: number): number {
  for (let i = 0; i < skyline.length - 1; i++) {
    if (skyline[i].x <= x && x < skyline[i + 1].x) return skyline[i].y;
  }
  return skyline.length > 0 ? skyline[skyline.length - 1].y : 0;
}

/**
 * Atualiza o skyline após colocar um retângulo em (x, y) com tamanho (w, h).
 * O contorno em [x, x+w] passa a ser y + h + kerf (kerf para próximo encaixe).
 */
function updateSkyline(
  skyline: SkylineSegment[],
  x: number,
  y: number,
  w: number,
  h: number,
  kerf: number
): SkylineSegment[] {
  const newH = y + h + kerf;
  const xEnd = x + w;
  const out: SkylineSegment[] = [];
  let i = 0;
  while (i < skyline.length && skyline[i].x < x) {
    out.push(skyline[i]);
    i++;
  }
  out.push({ x, y: newH });
  const heightAtEnd = getSkylineYAt(skyline, xEnd);
  while (i < skyline.length && skyline[i].x <= xEnd) i++;
  out.push({ x: xEnd, y: heightAtEnd });
  while (i < skyline.length) {
    out.push(skyline[i]);
    i++;
  }
  return mergeSkylineSegments(out);
}

function mergeSkylineSegments(segments: SkylineSegment[]): SkylineSegment[] {
  if (segments.length <= 1) return segments;
  const out: SkylineSegment[] = [{ ...segments[0] }];
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].y === out[out.length - 1].y) {
      out[out.length - 1].x = segments[i].x;
      continue;
    }
    out.push(segments[i]);
  }
  return out;
}

/**
 * Gera posições candidatas X para bottom-left (skyline): origem e cada início de segmento do skyline.
 */
function getCandidateX(skyline: SkylineSegment[], sheetW: number, pieceW: number): number[] {
  const xs = new Set<number>();
  xs.add(0);
  for (const seg of skyline) {
    if (seg.x > 0 && seg.x <= sheetW - pieceW) xs.add(seg.x);
  }
  return Array.from(xs).sort((a, b) => a - b);
}

/**
 * Candidatos bottom-left clássicos (fallback para casos em que o skyline não encontra posição).
 */
function getBottomLeftCandidates(
  placed: PlacedRect[],
  sheetW: number,
  sheetH: number,
  kerf: number
): Array<{ x: number; y: number }> {
  const set = new Set<string>();
  const add = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < sheetW && y < sheetH) set.add(`${x}|${y}`);
  };
  add(0, 0);
  for (const r of placed) {
    add(r.x + r.w + kerf, r.y);
    add(r.x, r.y + r.h + kerf);
    add(r.x + r.w + kerf, r.y + r.h + kerf);
    add(0, r.y + r.h + kerf);
    add(r.x + r.w + kerf, 0);
  }
  return Array.from(set)
    .map((v) => {
      const [x, y] = v.split("|").map(Number);
      return { x, y };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Verifica se o retângulo (x,y,w,h) sobrepõe algum retângulo colocado (com kerf). */
function overlaps(
  x: number,
  y: number,
  w: number,
  h: number,
  placed: PlacedRect[],
  kerf: number
): boolean {
  const margin = kerf / 2;
  for (const r of placed) {
    if (
      x + w + margin > r.x - margin &&
      r.x + r.w + margin > x - margin &&
      y + h + margin > r.y - margin &&
      r.y + r.h + margin > y - margin
    )
      return true;
  }
  return false;
}

type PlacementCandidate = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  orientationScore: number;
  rotationDelta: number;
  alternativeRotationAvailable: boolean;
};

type RotationScoringConfig = {
  rotationWeight: number;
  rotationPenalty: number;
  rotationPreferenceMode: RotationPreferenceMode;
};

function scoreOrientationFit(
  candidate: { x: number; y: number; w: number; h: number },
  sheet: SheetDefinition
): number {
  const sheetW = Math.max(1, sheet.largura_mm);
  const sheetH = Math.max(1, sheet.altura_mm);
  const sheetArea = Math.max(1, sheetW * sheetH);
  const rightSlack = Math.max(0, sheetW - (candidate.x + candidate.w));
  const topSlack = Math.max(0, sheetH - (candidate.y + candidate.h));
  const bottomLeft = 1 - (candidate.y / sheetH) * 0.7 - (candidate.x / sheetW) * 0.3;
  const stripWaste = (rightSlack * candidate.h + topSlack * candidate.w) / sheetArea;
  const fillQuality = 1 - stripWaste;
  return bottomLeft * 0.55 + fillQuality * 0.45;
}

function findBestPlacementForOrientation(
  w: number,
  h: number,
  rotation: number,
  sheet: SheetDefinition,
  placed: PlacedRect[],
  skyline: SkylineSegment[],
  kerf: number
): { x: number; y: number; w: number; h: number; rotation: number } | null {
  const sheetW = sheet.largura_mm;
  const sheetH = sheet.altura_mm;
  if (w > sheetW || h > sheetH) return null;

  let bestSkyline: { x: number; y: number; w: number; h: number; rotation: number } | null = null;
  const candidateXs = getCandidateX(skyline, sheetW, w);
  for (const x of candidateXs) {
    if (x + w > sheetW) continue;
    const y = getSkylineHeight(skyline, x, w);
    if (y + h > sheetH) continue;
    if (overlaps(x, y, w, h, placed, kerf)) continue;
    if (!bestSkyline || y < bestSkyline.y || (y === bestSkyline.y && x < bestSkyline.x)) {
      bestSkyline = { x, y, w, h, rotation };
    }
  }
  if (bestSkyline) return bestSkyline;

  const candidates = getBottomLeftCandidates(placed, sheetW, sheetH, kerf);
  for (const c of candidates) {
    if (c.x + w > sheetW || c.y + h > sheetH) continue;
    if (overlaps(c.x, c.y, w, h, placed, kerf)) continue;
    return { x: c.x, y: c.y, w, h, rotation };
  }
  return null;
}

/**
 * Encontra a melhor posição bottom-left para a peça (skyline + candidatos X).
 * Tenta 0° e 90° quando não há restrição de veio; escolhe sempre a posição válida
 * mais baixa e mais à esquerda; usa kerf na verificação de colisão.
 */
function findBestPlacement(
  piece: CutPiece,
  sheet: SheetDefinition,
  placed: PlacedRect[],
  skyline: SkylineSegment[],
  kerf: number,
  rotationCfg: RotationScoringConfig
): PlacementCandidate | null {
  const rotationAllowed = rotationCfg.rotationPreferenceMode !== "disabled" && !piece.grainDirection;
  const normal = findBestPlacementForOrientation(
    piece.largura_mm,
    piece.altura_mm,
    0,
    sheet,
    placed,
    skyline,
    kerf
  );
  const rotated = rotationAllowed
    ? findBestPlacementForOrientation(
      piece.altura_mm,
      piece.largura_mm,
      90,
      sheet,
      placed,
      skyline,
      kerf
    )
    : null;

  if (!normal && !rotated) return null;
  if (normal && !rotated) {
    return {
      ...normal,
      orientationScore: scoreOrientationFit(normal, sheet),
      rotationDelta: 0,
      alternativeRotationAvailable: false,
    };
  }
  if (!normal && rotated) {
    return {
      ...rotated,
      orientationScore: scoreOrientationFit(rotated, sheet),
      rotationDelta: 1,
      alternativeRotationAvailable: false,
    };
  }

  const normalScore = scoreOrientationFit(normal!, sheet);
  const rotatedScore = scoreOrientationFit(rotated!, sheet);
  const rotationDelta = rotatedScore - normalScore;

  let adjustedNormal = normalScore;
  let adjustedRotated = rotatedScore;

  if (rotationCfg.rotationPreferenceMode === "aggressive") {
    adjustedRotated += rotationCfg.rotationWeight;
  } else if (rotationCfg.rotationPreferenceMode === "auto") {
    adjustedRotated += Math.max(0, rotationDelta) * rotationCfg.rotationWeight;
    if (rotationDelta > 0) adjustedNormal -= rotationCfg.rotationPenalty * rotationDelta;
  }

  if (
    adjustedRotated > adjustedNormal ||
    (adjustedRotated === adjustedNormal &&
      (rotated!.y < normal!.y || (rotated!.y === normal!.y && rotated!.x < normal!.x)))
  ) {
    return {
      ...rotated!,
      orientationScore: rotatedScore,
      rotationDelta,
      alternativeRotationAvailable: true,
    };
  }

  return {
    ...normal!,
    orientationScore: normalScore,
    rotationDelta,
    alternativeRotationAvailable: true,
  };
}

function scorePlacement(
  sheet: SheetDefinition,
  placement: PlacementCandidate,
  currentUtilization: number,
  rotationCfg: RotationScoringConfig
): number {
  const sheetArea = Math.max(1, sheet.largura_mm * sheet.altura_mm);
  const areaGain = (placement.w * placement.h) / sheetArea;
  const bottomLeftBias =
    1 - (placement.y / Math.max(1, sheet.altura_mm)) - (placement.x / Math.max(1, sheet.largura_mm)) * 0.5;
  const expectedUtil = currentUtilization + areaGain;
  const utilizationReward = expectedUtil >= MIN_UTILIZATION_PERCENT ? 0.4 : expectedUtil * 0.2;
  let rotationScore = 0;
  if (rotationCfg.rotationPreferenceMode !== "disabled") {
    if (placement.rotation === 90) {
      rotationScore += rotationCfg.rotationWeight * (1 + Math.max(0, placement.rotationDelta));
    } else if (placement.alternativeRotationAvailable && placement.rotationDelta > 0) {
      rotationScore -= rotationCfg.rotationPenalty * placement.rotationDelta;
    }
  }

  return areaGain * 2.0 + bottomLeftBias * 0.3 + utilizationReward + placement.orientationScore * 0.25 + rotationScore;
}

function findBestPieceIndexForCurrentSheet(
  remaining: CutPiece[],
  sheet: SheetDefinition,
  placedRects: PlacedRect[],
  skyline: SkylineSegment[],
  kerf: number,
  searchWindow: number,
  rotationCfg: RotationScoringConfig
): { index: number; placement: PlacementCandidate } | null {
  if (remaining.length === 0) return null;
  const currentUtil = calculateSheetUtilization(placedRects, sheet.largura_mm, sheet.altura_mm);
  const limit = Math.max(1, Math.min(searchWindow, remaining.length));
  let best:
    | { index: number; placement: PlacementCandidate; score: number }
    | null = null;

  for (let i = 0; i < limit; i++) {
    const piece = remaining[i];
    const placement = findBestPlacement(piece, sheet, placedRects, skyline, kerf, rotationCfg);
    if (!placement) continue;
    const score = scorePlacement(sheet, placement, currentUtil, rotationCfg);
    if (!best || score > best.score) best = { index: i, placement, score };
  }

  return best ? { index: best.index, placement: best.placement } : null;
}

function fillGaps(
  remaining: CutPiece[],
  sheet: SheetDefinition,
  placements: CutPlacement[],
  placedRects: PlacedRect[],
  skyline: SkylineSegment[],
  kerf: number,
  sheetIndex: number,
  rotationCfg: RotationScoringConfig,
  onGapFillPlaced?: (placement: CutPlacement) => void
): { remaining: CutPiece[]; skyline: SkylineSegment[]; placedSomething: boolean } {
  if (remaining.length === 0) return { remaining, skyline, placedSomething: false };

  let localRemaining = reorderPieces(remaining, "gapFill");
  let localSkyline = skyline;
  let progress = true;
  let placedSomething = false;

  while (progress) {
    progress = false;
    const candidate = findBestPieceIndexForCurrentSheet(
      localRemaining,
      sheet,
      placedRects,
      localSkyline,
      kerf,
      localRemaining.length,
      rotationCfg
    );
    if (!candidate) break;
    const piece = localRemaining[candidate.index];
    if (!isInsideSheet(candidate.placement.x, candidate.placement.y, candidate.placement.w, candidate.placement.h, sheet)) {
      // Rejeição de segurança: placement inválido para a chapa atual.
      localRemaining.splice(candidate.index, 1);
      continue;
    }
    const pl: CutPlacement = {
      x_mm: candidate.placement.x,
      y_mm: candidate.placement.y,
      largura_mm: candidate.placement.w,
      altura_mm: candidate.placement.h,
      rotacao: candidate.placement.rotation,
      sheetIndex,
      boxId: piece.boxId,
      partName: piece.partName,
      materialId: piece.materialId,
      materialName: piece.materialName,
    };
    placements.push(pl);
    onGapFillPlaced?.(pl);
    placedRects.push({
      x: candidate.placement.x,
      y: candidate.placement.y,
      w: candidate.placement.w,
      h: candidate.placement.h,
    });
    localSkyline = updateSkyline(
      localSkyline,
      candidate.placement.x,
      candidate.placement.y,
      candidate.placement.w,
      candidate.placement.h,
      kerf
    );
    localRemaining.splice(candidate.index, 1);
    placedSomething = true;
    progress = true;
  }

  return { remaining: localRemaining, skyline: localSkyline, placedSomething };
}

function canFitAnyRemainingPiece(
  remaining: CutPiece[],
  sheet: SheetDefinition,
  placedRects: PlacedRect[],
  skyline: SkylineSegment[],
  kerf: number,
  rotationCfg: RotationScoringConfig
): boolean {
  const fit = findBestPieceIndexForCurrentSheet(
    remaining,
    sheet,
    placedRects,
    skyline,
    kerf,
    remaining.length,
    rotationCfg
  );
  return Boolean(fit);
}

export function runCutLayout(
  pieces: CutPiece[],
  sheetDef: SheetDefinition,
  options?: CutLayoutEngineOptions
): CutLayoutResult {
  const kerf = options?.kerf_mm ?? DEFAULT_KERF_MM;
  const minUtilizationPercent = options?.minUtilizationPercent ?? MIN_UTILIZATION_PERCENT;
  const rotationCfg: RotationScoringConfig = {
    rotationWeight: options?.rotationWeight ?? DEFAULT_ROTATION_WEIGHT,
    rotationPenalty: options?.rotationPenalty ?? DEFAULT_ROTATION_PENALTY,
    rotationPreferenceMode: options?.rotationPreferenceMode ?? DEFAULT_ROTATION_MODE,
  };
  const expanded = expandPieces(pieces);
  const grouped = options?.groupByThicknessOnly
    ? groupByThicknessOnly(expanded)
    : groupByMaterialAndThickness(expanded);

  const sheets: SheetResult[] = [];
  const diagnostics = options?.collectDiagnostics
    ? {
      flow: {
        skylineEnabled: true,
        reorderEnabled: true,
        gapFillEnabled: true,
        gapFillAttempts: 0,
        rescueAttempts: 0,
        rotationPreferenceMode: rotationCfg.rotationPreferenceMode,
      },
      rejectedByLimit: [] as Array<{
        partName: string;
        boxId: string;
        largura_mm: number;
        altura_mm: number;
        reason: string;
      }>,
      gapFillPlacements: [] as Array<{
        partName: string;
        boxId: string;
        sheetIndex: number;
        rotacao: number;
        x_mm: number;
        y_mm: number;
        largura_mm: number;
        altura_mm: number;
      }>,
    }
    : undefined;

  for (const [key, groupPieces] of grouped) {
    let remaining = reorderPieces(groupPieces, "production");

    const espStr = options?.groupByThicknessOnly ? key : key.split("|")[1];
    const materialId = options?.groupByThicknessOnly
      ? (sheetDef.materialId ?? groupPieces[0]?.materialId ?? "material")
      : key.split("|")[0];
    const sheet: SheetDefinition = {
      largura_mm: options?.sheetLargura_mm ?? sheetDef.largura_mm,
      altura_mm: options?.sheetAltura_mm ?? sheetDef.altura_mm,
      espessura_mm: Number(espStr) || sheetDef.espessura_mm,
      materialId: materialId !== "material" ? materialId : sheetDef.materialId,
      materialName: groupPieces[0]?.materialName ?? sheetDef.materialName,
    };

    let placements: CutPlacement[] = [];
    let placedRects: PlacedRect[] = [];
    let skyline: SkylineSegment[] = [{ x: 0, y: 0 }, { x: sheet.largura_mm, y: 0 }];
    let sheetIndex = 0;

    const finalizeSheet = () => {
      if (placements.length === 0) return;
      sheets.push({
        sheet: { ...sheet },
        placements: [...placements],
      });
      placements = [];
      placedRects = [];
      skyline = [{ x: 0, y: 0 }, { x: sheet.largura_mm, y: 0 }];
      sheetIndex++;
    };

    while (remaining.length > 0) {
      let placedInThisPass = false;
      let tryPlacing = true;

      while (tryPlacing && remaining.length > 0) {
        const candidate = findBestPieceIndexForCurrentSheet(
          remaining,
          sheet,
          placedRects,
          skyline,
          kerf,
          MAIN_SEARCH_WINDOW,
          rotationCfg
        );
        if (!candidate) {
          tryPlacing = false;
          break;
        }
        const piece = remaining[candidate.index];
        if (!isInsideSheet(candidate.placement.x, candidate.placement.y, candidate.placement.w, candidate.placement.h, sheet)) {
          console.warn("Placement inválido fora da chapa:", candidate.placement, piece);
          diagnostics?.rejectedByLimit.push({
            partName: piece.partName,
            boxId: piece.boxId,
            largura_mm: piece.largura_mm,
            altura_mm: piece.altura_mm,
            reason: "invalid-placement-outside-sheet",
          });
          remaining.splice(candidate.index, 1);
          continue;
        }
        placements.push({
          x_mm: candidate.placement.x,
          y_mm: candidate.placement.y,
          largura_mm: candidate.placement.w,
          altura_mm: candidate.placement.h,
          rotacao: candidate.placement.rotation,
          sheetIndex,
          boxId: piece.boxId,
          partName: piece.partName,
          materialId: piece.materialId,
          materialName: piece.materialName,
        });
        placedRects.push({
          x: candidate.placement.x,
          y: candidate.placement.y,
          w: candidate.placement.w,
          h: candidate.placement.h,
        });
        skyline = updateSkyline(
          skyline,
          candidate.placement.x,
          candidate.placement.y,
          candidate.placement.w,
          candidate.placement.h,
          kerf
        );
        remaining.splice(candidate.index, 1);
        placedInThisPass = true;
      }

      if (remaining.length === 0) break;

      // Se não coube nada numa chapa vazia, a peça é inválida para esta chapa.
      if (!placedInThisPass && placements.length === 0) {
        console.warn("Peça excede dimensões da chapa:", remaining[0]);
        diagnostics?.rejectedByLimit.push({
          partName: remaining[0].partName,
          boxId: remaining[0].boxId,
          largura_mm: remaining[0].largura_mm,
          altura_mm: remaining[0].altura_mm,
          reason: "piece-does-not-fit-empty-sheet",
        });
        remaining.shift();
        continue;
      }

      // Antes de abrir nova chapa, tenta gap-filling industrial.
      diagnostics && (diagnostics.flow.gapFillAttempts += 1);
      const fillResult = fillGaps(
        remaining,
        sheet,
        placements,
        placedRects,
        skyline,
        kerf,
        sheetIndex,
        rotationCfg,
        (pl) => diagnostics?.gapFillPlacements.push({
          partName: pl.partName,
          boxId: pl.boxId,
          sheetIndex: pl.sheetIndex,
          rotacao: pl.rotacao,
          x_mm: pl.x_mm,
          y_mm: pl.y_mm,
          largura_mm: pl.largura_mm,
          altura_mm: pl.altura_mm,
        })
      );
      remaining = reorderPieces(fillResult.remaining, "production");
      skyline = fillResult.skyline;

      const utilization = calculateSheetUtilization(placedRects, sheet.largura_mm, sheet.altura_mm);
      if (utilization < minUtilizationPercent) {
        // Tenta mais uma passada completa sobre todas as peças restantes antes de abrir nova chapa.
        diagnostics && (diagnostics.flow.rescueAttempts += 1);
        const rescue = findBestPieceIndexForCurrentSheet(
          remaining,
          sheet,
          placedRects,
          skyline,
          kerf,
          remaining.length,
          rotationCfg
        );
        if (rescue) {
          const piece = remaining[rescue.index];
          if (!isInsideSheet(rescue.placement.x, rescue.placement.y, rescue.placement.w, rescue.placement.h, sheet)) {
            console.warn("Placement de rescue inválido fora da chapa:", rescue.placement, piece);
            diagnostics?.rejectedByLimit.push({
              partName: piece.partName,
              boxId: piece.boxId,
              largura_mm: piece.largura_mm,
              altura_mm: piece.altura_mm,
              reason: "invalid-rescue-placement-outside-sheet",
            });
            remaining.splice(rescue.index, 1);
            remaining = reorderPieces(remaining, "production");
            continue;
          }
          placements.push({
            x_mm: rescue.placement.x,
            y_mm: rescue.placement.y,
            largura_mm: rescue.placement.w,
            altura_mm: rescue.placement.h,
            rotacao: rescue.placement.rotation,
            sheetIndex,
            boxId: piece.boxId,
            partName: piece.partName,
            materialId: piece.materialId,
            materialName: piece.materialName,
          });
          placedRects.push({
            x: rescue.placement.x,
            y: rescue.placement.y,
            w: rescue.placement.w,
            h: rescue.placement.h,
          });
          skyline = updateSkyline(
            skyline,
            rescue.placement.x,
            rescue.placement.y,
            rescue.placement.w,
            rescue.placement.h,
            kerf
          );
          remaining.splice(rescue.index, 1);
          remaining = reorderPieces(remaining, "production");
          continue;
        }
      }

      // Regra industrial: nunca abrir nova chapa se ainda existir peça encaixável.
      if (canFitAnyRemainingPiece(remaining, sheet, placedRects, skyline, kerf, rotationCfg)) {
        remaining = reorderPieces(remaining, "production");
        continue;
      }

      // Só abre nova chapa quando não há mais peça encaixável na chapa atual.
      finalizeSheet();
    }

    finalizeSheet();
  }

  return diagnostics ? { sheets, diagnostics } : { sheets };
}
