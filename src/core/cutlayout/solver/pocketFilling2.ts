/**
 * Pocket Filling 2.0 — Nesting Engine 2.3
 *
 * Preenchimento inteligente de bolsões em chapas tardias.
 * Move peças de chapas subsequentes para bolsões livres em chapas com desperdício elevado.
 *
 * Puro: sem efeitos colaterais no pipeline TCN.
 * Contrato de dados TCN inalterado.
 *
 * SEGURANÇA DE ROTAÇÃO (Fase A A5):
 *   Rotação 90° permitida durante pocket fill quando grainDirection/topDrillable o permitem.
 *   Caso contrário mantém-se a orientação original.
 */

import type { CutPlacement, SheetDefinition, SheetResult } from "../cutLayoutTypes";
import { canRotatePieceGeometry } from "../utils/cutLayoutGeomRotation";

const EPS = 0.001;

/** Área máxima de peça elegível a gap/pocket fill alargado (Fase A A5). */
export const POCKET_GAP_FILL_MAX_PIECE_AREA_MM2 = 80_000;

/** Dimensões mínimas para um bolsão ser considerado útil (mm). */
const MIN_POCKET_W = 150;
const MIN_POCKET_H = 150;

/**
 * Classificação industrial de chapas:
 *   Excelente : desperdício ≤ 10%  → PROIBIDO mexer (stableDestThreshold no spmLock)
 *   Boa       : 10% < desp ≤ 15%  → mexer só com ganho real
 *   Fraca     : desperdício > 15%  → candidata a redistribuição
 */
/** Limiar de chapa Excelente — usada como referência para stableDestThreshold no SPM. */
export const EXCELLENT_SHEET_THRESHOLD = 0.10;

/**
 * Índice relativo mínimo para considerar uma chapa elegível como destino.
 * 0.0 = TODAS as chapas são avaliadas (Excelente/Boa/Fraca distinguidas pelo wasteThreshold).
 * Anteriormente 0.40 — alterado para respeitar a regra "qualquer chapa Fraca é redistribuível".
 */
const LATE_SHEET_INDEX_THRESHOLD = 0.0;

/**
 * Rácio mínimo de desperdício para considerar uma chapa como "Fraca" e candidata a destino.
 * Alinhado com a classificação industrial: Fraca = desperdício > 15%.
 * Anteriormente 0.14.
 */
const LATE_SHEET_WASTE_THRESHOLD = 0.15;

/** Chapas com desperdício até este valor são consideradas boas e não são mexidas. */
const STABLE_SHEET_WASTE_THRESHOLD = 0.12;

/**
 * Regras de congelamento para Single-Project Mode (SPM Lock).
 * Impedem que o pocket filling perturbe chapas já bem aproveitadas.
 */
export type SpmLockOptions = {
  /**
   * Chapas de DESTINO com desperdício ≤ este limiar são consideradas "estáveis"
   * e não recebem peças adicionais via pocket filling.
   * Padrão: 0.20 (20%). Exemplo: chapa com 8% desperdício → protegida.
   */
  stableDestThreshold?: number;
  /**
   * Melhoria mínima de desperdício total (em rácio 0–1) para confirmar todos os
   * movimentos efectuados. Se a melhoria for inferior a este valor E nenhuma chapa
   * foi eliminada, todos os movimentos são desfeitos (rollback).
   * Padrão: 0.05 (5 pontos percentuais).
   */
  minTotalWasteImprovement?: number;
};

/**
 * Opções de configuração para aplicarPocketFilling.
 * Permitem ajustar os limiares por modo (MPM vs SPM).
 */
export type PocketFillingOptions = {
  /** Índice relativo mínimo [0–1] para considerar uma chapa elegível (padrão: 0.40). */
  lateIndexThreshold?: number;
  /** Rácio mínimo de desperdício [0–1] para ativar o filling numa chapa (padrão: 0.14). */
  wasteThreshold?: number;
  /**
   * Regras de congelamento para Single-Project Mode.
   * Quando definidas, activam protecção de chapas estáveis e verificação de
   * melhoria global antes de confirmar qualquer movimento.
   */
  spmLock?: SpmLockOptions;
};

/** Máximo de peças a tentar colocar por bolsão. */
const MAX_PIECES_PER_POCKET = 6;

/**
 * Fase 7D: no máximo N ordenações "inteligentes" por bolsão; depois fallback barato.
 */
const MAX_SMART_POCKET_REORDER = 3;

function pieceSquareFriendlyMm(w: number, h: number): boolean {
  const m = Math.max(w, h);
  if (m < EPS) return false;
  return Math.abs(w - h) / m < 0.05;
}

function pieceLongStripMm(w: number, h: number): boolean {
  const a = Math.max(w, h);
  const b = Math.min(w, h);
  return b > EPS && a / b >= 3;
}

function logWhRatio(w: number, h: number): number {
  return Math.log(Math.max(w, 1e-6) / Math.max(h, 1e-6));
}

export type FreeRect = { x: number; y: number; w: number; h: number };

type PlacementOrientation = { w: number; h: number; rotacao: number };

function isRotatablePlacement(p: CutPlacement): boolean {
  if (p.largura_mm === p.altura_mm) return false;
  const meta = p.metadata;
  if (meta && meta.industrialGrainCode === "YY") return false;
  if (meta && typeof meta.grainDirection === "string" && meta.grainDirection) return false;
  const holes = p.originalDrillHoles ?? p.drillHoles ?? p.holes ?? [];
  return canRotatePieceGeometry({ drillHoles: holes, holes });
}

function getPlacementOrientations(p: CutPlacement): PlacementOrientation[] {
  const primary: PlacementOrientation = {
    w: p.largura_mm,
    h: p.altura_mm,
    rotacao: p.rotacao ?? 0,
  };
  const out: PlacementOrientation[] = [primary];
  if (!isRotatablePlacement(p)) return out;
  const altRot = primary.rotacao === 90 ? 0 : 90;
  const alt: PlacementOrientation = { w: p.altura_mm, h: p.largura_mm, rotacao: altRot };
  if (alt.w !== primary.w || alt.h !== primary.h) out.push(alt);
  return out;
}

function pieceFitsPocket(pocket: FreeRect, w: number, h: number): boolean {
  return w <= pocket.w + EPS && h <= pocket.h + EPS;
}

function pushPlacedPiece(
  piece: CutPlacement,
  x: number,
  y: number,
  o: PlacementOrientation,
  destSheetIndex: number,
  localPlaced: Array<{ x: number; y: number; w: number; h: number }>,
  result: CutPlacement[]
): CutPlacement {
  const placed: CutPlacement = {
    ...piece,
    x_mm: x,
    y_mm: y,
    largura_mm: o.w,
    altura_mm: o.h,
    rotacao: o.rotacao,
    sheetIndex: destSheetIndex,
  };
  result.push(placed);
  localPlaced.push({ x, y, w: o.w, h: o.h });
  return placed;
}

// ---------------------------------------------------------------------------
// Utilitários internos
// ---------------------------------------------------------------------------

function overlapsAny(
  x: number,
  y: number,
  w: number,
  h: number,
  placed: Array<{ x: number; y: number; w: number; h: number }>,
  kerf: number
): boolean {
  return placed.some(
    (r) =>
      x + w + kerf > r.x &&
      x < r.x + r.w + kerf &&
      y + h + kerf > r.y &&
      y < r.y + r.h + kerf
  );
}

// ---------------------------------------------------------------------------
// a) detectarBolsões
// ---------------------------------------------------------------------------

/**
 * Identifica bolsões livres na chapa com dimensões ≥ 150 × 150 mm.
 *
 * Para cada origem candidata (canto direito+superior de cada peça colocada),
 * calcula o maior rectângulo livre que cabe a partir desse ponto.
 * Retorna os bolsões ordenados por área (maior primeiro), sem bolsões dominados.
 */
export function detectarBolsões(
  placements: CutPlacement[],
  sheet: SheetDefinition,
  kerf: number
): FreeRect[] {
  const W = sheet.largura_mm;
  const H = sheet.altura_mm;
  const rects = placements.map((p) => ({
    x: p.x_mm,
    y: p.y_mm,
    w: p.largura_mm,
    h: p.altura_mm,
  }));

  const xCandidates = [0, ...rects.map((r) => r.x + r.w + kerf)].filter(
    (x) => x >= 0 && x + MIN_POCKET_W <= W + EPS
  );
  const yCandidates = [0, ...rects.map((r) => r.y + r.h + kerf)].filter(
    (y) => y >= 0 && y + MIN_POCKET_H <= H + EPS
  );

  const pockets: FreeRect[] = [];

  for (const ox of xCandidates) {
    for (const oy of yCandidates) {
      // Verificar se a origem está livre (não dentro de nenhuma peça colocada)
      const blocked = rects.some(
        (r) => r.x < ox + EPS && r.x + r.w > ox && r.y < oy + EPS && r.y + r.h > oy
      );
      if (blocked) continue;

      // Expandir à direita até bater numa peça (considerando a faixa Y mínima)
      let maxW = W - ox;
      for (const r of rects) {
        if (r.y + r.h > oy && r.y < oy + MIN_POCKET_H) {
          if (r.x > ox + EPS) {
            maxW = Math.min(maxW, r.x - ox);
          } else if (r.x + r.w > ox + EPS) {
            maxW = 0;
            break;
          }
        }
      }
      if (maxW < MIN_POCKET_W - EPS) continue;

      // Expandir para cima até bater numa peça (considerando a faixa X final)
      let maxH = H - oy;
      for (const r of rects) {
        if (r.x + r.w > ox && r.x < ox + maxW) {
          if (r.y > oy + EPS) {
            maxH = Math.min(maxH, r.y - oy);
          } else if (r.y + r.h > oy + EPS) {
            maxH = 0;
            break;
          }
        }
      }
      if (maxH < MIN_POCKET_H - EPS) continue;

      pockets.push({ x: ox, y: oy, w: maxW, h: maxH });
    }
  }

  // Ordenar por área e remover bolsões dominados (contidos por um maior)
  pockets.sort((a, b) => b.w * b.h - a.w * a.h);
  return pockets.filter(
    (p, i) =>
      !pockets.slice(0, i).some(
        (q) =>
          q.x <= p.x + EPS &&
          q.y <= p.y + EPS &&
          q.x + q.w >= p.x + p.w - EPS &&
          q.y + q.h >= p.y + p.h - EPS
      )
  );
}

// ---------------------------------------------------------------------------
// b) selecionarPeçasParaPocket
// ---------------------------------------------------------------------------

/**
 * Seleciona, de uma lista de placements candidatos, os que cabem no bolsão
 * (orientação actual ou 90° quando permitido pela geometria industrial).
 *
 * Fase 7C: ordenação por compatibilidade de proporção com o bolsão, peças
 * quadradas-friendly em bolsões quadrados, alinhamento de tiras longas (≥3:1)
 * com bolsões alongados, e área crescente para favorecer preenchimento fino.
 */
export function selecionarPeçasParaPocket(
  pocket: FreeRect,
  candidates: CutPlacement[]
): CutPlacement[] {
  const fitting = candidates.filter((p) =>
    getPlacementOrientations(p).some((o) => pieceFitsPocket(pocket, o.w, o.h))
  );

  const pocketLong = pieceLongStripMm(pocket.w, pocket.h);
  const pocketSquare = pieceSquareFriendlyMm(pocket.w, pocket.h);
  const pocketRl = logWhRatio(pocket.w, pocket.h);

  const score = (p: CutPlacement): number => {
    const w = p.largura_mm;
    const h = p.altura_mm;
    const sq = pieceSquareFriendlyMm(w, h);
    const lng = pieceLongStripMm(w, h);
    const rl = logWhRatio(w, h);
    const ratioDist = Math.abs(rl - pocketRl);
    const area = w * h;

    let tier = 1;
    if (pocketSquare && sq) tier = 0;
    else if (pocketLong) {
      const horizPocket = pocket.w >= pocket.h;
      const horizPiece = w >= h;
      if (horizPocket === horizPiece) tier = 0;
      else tier = 2;
    } else if (lng) tier = 2;

    return tier * 1e12 + ratioDist * 1e6 + area;
  };

  fitting.sort((a, b) => score(a) - score(b));

  return fitting;
}

/**
 * Fallback Fase 7D: só área crescente (menor primeiro) — custo O(n log n) simples.
 */
function selecionarPeçasParaPocketAreaAsc(
  pocket: FreeRect,
  candidates: CutPlacement[]
): CutPlacement[] {
  const fitting = candidates.filter((p) =>
    getPlacementOrientations(p).some((o) => pieceFitsPocket(pocket, o.w, o.h))
  );
  fitting.sort((a, b) => a.largura_mm * a.altura_mm - b.largura_mm * b.altura_mm);
  return fitting;
}

// ---------------------------------------------------------------------------
// c) preencherPocket
// ---------------------------------------------------------------------------

/**
 * Tenta colocar até MAX_PIECES_PER_POCKET peças dentro do bolsão
 * usando mini-shelves (faixas horizontais).
 *
 * Fase A (A5): tenta rotação 90° quando permitido pela geometria industrial.
 * Valida ausência de sobreposição com as peças já existentes na chapa.
 *
 * @param pocket             Bolsão livre (posição + dimensões).
 * @param candidates         Peças candidatas (ordenadas por selecionarPeçasParaPocket).
 * @param existingRects      Rectângulos já ocupados na chapa de destino.
 * @param destSheetIndex     Índice da chapa de destino.
 * @param kerf               Espessura de corte em mm.
 */
export function preencherPocket(
  pocket: FreeRect,
  candidates: CutPlacement[],
  existingRects: Array<{ x: number; y: number; w: number; h: number }>,
  destSheetIndex: number,
  kerf: number
): CutPlacement[] {
  const result: CutPlacement[] = [];
  const localPlaced = [...existingRects];
  let curX = pocket.x;
  let curY = pocket.y;
  let shelfH = 0;
  let count = 0;
  let remaining = [...candidates];
  let smartReorderPass = 0;

  while (count < MAX_PIECES_PER_POCKET && remaining.length > 0) {
    const remW = pocket.x + pocket.w - curX;
    const remH = pocket.y + pocket.h - curY;
    if (remW < -EPS || remH < -EPS) break;

    const headPocket: FreeRect = {
      x: curX,
      y: curY,
      w: Math.max(0, remW),
      h: Math.max(0, remH),
    };
    const ordered =
      smartReorderPass < MAX_SMART_POCKET_REORDER
        ? selecionarPeçasParaPocket(headPocket, remaining)
        : selecionarPeçasParaPocketAreaAsc(headPocket, remaining);
    if (smartReorderPass < MAX_SMART_POCKET_REORDER) smartReorderPass += 1;
    if (ordered.length === 0) {
      if (shelfH > 0) {
        curY += shelfH + kerf;
        curX = pocket.x;
        shelfH = 0;
        continue;
      }
      break;
    }

    let placedThisRound = false;
    for (const piece of ordered) {
      const orientations = getPlacementOrientations(piece);
      let piecePlaced = false;

      for (const o of orientations) {
        const pw = o.w;
        const ph = o.h;
        if (
          curX + pw <= pocket.x + pocket.w + EPS &&
          curY + ph <= pocket.y + pocket.h + EPS &&
          !overlapsAny(curX, curY, pw, ph, localPlaced, kerf)
        ) {
          pushPlacedPiece(piece, curX, curY, o, destSheetIndex, localPlaced, result);
          curX += pw + kerf;
          shelfH = Math.max(shelfH, ph);
          count++;
          remaining = remaining.filter((p) => p !== piece);
          piecePlaced = true;
          placedThisRound = true;
          break;
        }

        if (shelfH > 0) {
          const newY = curY + shelfH + kerf;
          const newX = pocket.x;
          if (
            newX + pw <= pocket.x + pocket.w + EPS &&
            newY + ph <= pocket.y + pocket.h + EPS &&
            !overlapsAny(newX, newY, pw, ph, localPlaced, kerf)
          ) {
            pushPlacedPiece(piece, newX, newY, o, destSheetIndex, localPlaced, result);
            curX = newX + pw + kerf;
            curY = newY;
            shelfH = ph;
            count++;
            remaining = remaining.filter((p) => p !== piece);
            piecePlaced = true;
            placedThisRound = true;
            break;
          }
        }
      }

      if (piecePlaced) break;
    }

    if (!placedThisRound) {
      if (shelfH > 0) {
        curY += shelfH + kerf;
        curX = pocket.x;
        shelfH = 0;
        continue;
      }
      break;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Utilitário: desperdício total de um conjunto de chapas
// ---------------------------------------------------------------------------

function calcTotalWasteArea(sheets: SheetResult[]): number {
  return sheets.reduce((acc, s) => {
    const area = Math.max(1, s.sheet.largura_mm * s.sheet.altura_mm);
    const used = s.placements.reduce((a, p) => a + p.largura_mm * p.altura_mm, 0);
    return acc + Math.max(0, area - used);
  }, 0);
}

function calcTotalSheetArea(sheets: SheetResult[]): number {
  return sheets.reduce((acc, s) => acc + Math.max(1, s.sheet.largura_mm * s.sheet.altura_mm), 0);
}

// ---------------------------------------------------------------------------
// d) aplicarPocketFilling — função principal
// ---------------------------------------------------------------------------

/**
 * Para cada chapa elegível (índice relativo > lateIndexThreshold e desperdício > wasteThreshold),
 * detecta bolsões livres e tenta mover peças de chapas SUBSEQUENTES para esses bolsões.
 *
 * Decisão de mover: apenas se a peça couber sem sobreposição na orientação original.
 * Se uma chapa fonte ficar vazia após mover, é removida do resultado.
 *
 * SPM Lock (opts.spmLock):
 *   - Chapas de destino "estáveis" (desperdício ≤ stableDestThreshold) são ignoradas.
 *   - Após todos os movimentos, se a melhoria de desperdício total for insuficiente
 *     E nenhuma chapa foi eliminada, todos os movimentos são desfeitos (rollback).
 *
 * @param sheets   Todas as chapas do run.
 * @param kerf     Espessura de corte em mm.
 * @param opts     Limiares configuráveis (omitir = valores MPM padrão).
 */
export function aplicarPocketFilling(
  sheets: SheetResult[],
  kerf: number,
  opts?: PocketFillingOptions
): SheetResult[] {
  const lateIndexThr = opts?.lateIndexThreshold ?? LATE_SHEET_INDEX_THRESHOLD;
  const wasteThr = opts?.wasteThreshold ?? LATE_SHEET_WASTE_THRESHOLD;
  const spmLock = opts?.spmLock;
  const stableDestThr = spmLock?.stableDestThreshold ?? 0.20;
  const minTotalImprov = spmLock?.minTotalWasteImprovement ?? 0.05;

  const totalSheets = sheets.length;
  if (totalSheets < 2) return sheets;

  // ── Guard SPM Lock: captura o estado antes de qualquer movimento ───────────
  const wasteAreaBefore = spmLock ? calcTotalWasteArea(sheets) : 0;
  const totalSheetArea = spmLock ? calcTotalSheetArea(sheets) : 1;
  const sheetCountBefore = sheets.length;
  // ──────────────────────────────────────────────────────────────────────────

  const result = sheets.map((s) => ({ ...s, placements: [...s.placements] }));

  // ── Guard a): chapa com menor desperdício é IMUTÁVEL como fonte ─────────────
  // Nunca mover peças da chapa mais bem aproveitada do run,
  // independentemente da sua posição na sequência.
  let bestSrcIdx = -1;
  let bestSrcWaste = Infinity;
  for (let _i = 0; _i < totalSheets; _i++) {
    const _a = Math.max(1, result[_i].sheet.largura_mm * result[_i].sheet.altura_mm);
    const _u = result[_i].placements.reduce((acc, p) => acc + p.largura_mm * p.altura_mm, 0);
    const _w = Math.max(0, (_a - _u) / _a);
    if (_w < bestSrcWaste) { bestSrcWaste = _w; bestSrcIdx = _i; }
  }
  // ──────────────────────────────────────────────────────────────────────────

  for (let si = 0; si < totalSheets - 1; si++) {
    const relIndex = si / Math.max(1, totalSheets - 1);
    if (relIndex < lateIndexThr) continue;

    const destSheet = result[si];
    const sheetArea = Math.max(1, destSheet.sheet.largura_mm * destSheet.sheet.altura_mm);
    const usedArea = destSheet.placements.reduce((acc, p) => acc + p.largura_mm * p.altura_mm, 0);
    const wasteRatio = Math.max(0, (sheetArea - usedArea) / sheetArea);
    if (wasteRatio <= wasteThr || wasteRatio <= STABLE_SHEET_WASTE_THRESHOLD) continue;

    // ── Guard SPM Lock — Protecção de chapas estáveis ──────────────────────
    // Chapas com desperdício ≤ stableDestThreshold estão bem aproveitadas:
    // não devem receber peças adicionais (evita misturar corpo do móvel com portas).
    if (spmLock && wasteRatio <= stableDestThr) {
      console.log(
        `[PF2][SPM-LOCK] Chapa ${si} protegida (desperdício=${(wasteRatio * 100).toFixed(1)}% ≤ ${(stableDestThr * 100).toFixed(0)}% estável)`
      );
      continue;
    }
    // ──────────────────────────────────────────────────────────────────────

    const pockets = detectarBolsões(destSheet.placements, destSheet.sheet, kerf);
    if (pockets.length === 0) continue;

    for (const pocket of pockets) {
      for (let sj = si + 1; sj < totalSheets; sj++) {
        const srcSheet = result[sj];
        if (srcSheet.placements.length === 0) continue;
        // Guard a): nunca mover peças da chapa com menor desperdício do run
        if (sj === bestSrcIdx) continue;
        const srcArea = Math.max(1, srcSheet.sheet.largura_mm * srcSheet.sheet.altura_mm);
        const srcUsed = srcSheet.placements.reduce((acc, p) => acc + p.largura_mm * p.altura_mm, 0);
        const srcWasteRatio = Math.max(0, (srcArea - srcUsed) / srcArea);
        if (srcWasteRatio <= STABLE_SHEET_WASTE_THRESHOLD) continue;

        const candidates = selecionarPeçasParaPocket(pocket, srcSheet.placements);
        if (candidates.length === 0) continue;

        const existingRects = destSheet.placements.map((p) => ({
          x: p.x_mm,
          y: p.y_mm,
          w: p.largura_mm,
          h: p.altura_mm,
        }));

        const newPlacements = preencherPocket(pocket, candidates, existingRects, si, kerf);
        if (newPlacements.length === 0) continue;

        // Guard b): só confirmar se o volume movido ≥ 3% da área da chapa
        // Evita perturbações no layout por movimentos de peças demasiado pequenas.
        const movedArea = newPlacements.reduce((acc, p) => acc + p.largura_mm * p.altura_mm, 0);
        if (movedArea < sheetArea * 0.03) continue;

        // Identificar peças movidas pela posição original (único por chapa/posição)
        const movedKeys = new Set(
          newPlacements.map((p) => `${p.boxId}::${p.partName}::${p.x_mm}::${p.y_mm}`)
        );

        // Guard c): se srcSheet ficaria com apenas 1 peça isolada → cancelar
        const remainingCount = srcSheet.placements.filter(
          (p) => !movedKeys.has(`${p.boxId}::${p.partName}::${p.x_mm}::${p.y_mm}`)
        ).length;
        if (remainingCount === 1) continue;

        result[sj] = {
          ...srcSheet,
          placements: srcSheet.placements.filter(
            (p) => !movedKeys.has(`${p.boxId}::${p.partName}::${p.x_mm}::${p.y_mm}`)
          ),
        };
        result[si] = {
          ...destSheet,
          placements: [...destSheet.placements, ...newPlacements],
        };

        console.log(
          `[PF2] Chapa ${si} ← ${newPlacements.length} peça(s) de chapa ${sj} (bolsão ${pocket.w.toFixed(0)}×${pocket.h.toFixed(0)}mm)`
        );
        break; // Um único source por bolsão
      }
    }
  }

  // Remover chapas que ficaram completamente vazias após as transferências
  const filtered = result.filter((s) => s.placements.length > 0);

  // ── Guard SPM Lock — Verificação de melhoria global ───────────────────────
  // Se o SPM Lock está ativo, só confirmar os movimentos quando:
  //   a) pelo menos 1 chapa foi eliminada (melhoria estrutural clara), OU
  //   b) a melhoria de desperdício total ≥ minTotalWasteImprovement
  // Caso contrário, retornar o estado original (rollback silencioso).
  if (spmLock) {
    const sheetsSaved = sheetCountBefore - filtered.length;
    const wasteAreaAfter = calcTotalWasteArea(filtered);
    const wasteImprovRatio =
      totalSheetArea > 0 ? (wasteAreaBefore - wasteAreaAfter) / totalSheetArea : 0;

    if (sheetsSaved > 0 || wasteImprovRatio >= minTotalImprov) {
      console.log(
        `[PF2][SPM-LOCK] Movimentos confirmados: chapas_poupadas=${sheetsSaved}, melhoria=${(wasteImprovRatio * 100).toFixed(1)}pp`
      );
      return filtered;
    }

    console.log(
      `[PF2][SPM-LOCK] Rollback — melhoria insuficiente (${(wasteImprovRatio * 100).toFixed(1)}pp < ${(minTotalImprov * 100).toFixed(0)}pp) e nenhuma chapa eliminada`
    );
    return sheets; // Rollback: devolver estado original intacto
  }
  // ──────────────────────────────────────────────────────────────────────────

  return filtered;
}
