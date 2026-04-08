/**
 * Pocket Filling 2.0 — Nesting Engine 2.3
 *
 * Preenchimento inteligente de bolsões em chapas tardias.
 * Move peças de chapas subsequentes para bolsões livres em chapas com desperdício elevado.
 *
 * Puro: sem efeitos colaterais no pipeline TCN.
 * Contrato de dados TCN inalterado.
 *
 * SEGURANÇA DE ROTAÇÃO:
 *   As peças são movidas mantendo a rotação original (sem re-rotação).
 *   Isto garante que grainDirection e topDrillable são respeitados.
 */

import type { CutPlacement, SheetDefinition, SheetResult } from "../cutLayoutTypes";

const EPS = 0.001;

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
const MAX_PIECES_PER_POCKET = 3;

export type FreeRect = { x: number; y: number; w: number; h: number };

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
 * (na sua rotação actual — sem re-rotação, por segurança de grainDirection).
 *
 * Ordenação:
 *   1. Maior área
 *   2. Maior lado
 *   3. Melhor razão w/h em relação ao bolsão
 */
export function selecionarPeçasParaPocket(
  pocket: FreeRect,
  candidates: CutPlacement[]
): CutPlacement[] {
  const fitting = candidates.filter(
    (p) => p.largura_mm <= pocket.w + EPS && p.altura_mm <= pocket.h + EPS
  );

  const pocketRatio = pocket.w / Math.max(1, pocket.h);
  fitting.sort((a, b) => {
    const areaA = a.largura_mm * a.altura_mm;
    const areaB = b.largura_mm * b.altura_mm;
    if (Math.abs(areaA - areaB) > 100) return areaB - areaA;
    const maxA = Math.max(a.largura_mm, a.altura_mm);
    const maxB = Math.max(b.largura_mm, b.altura_mm);
    if (Math.abs(maxA - maxB) > 5) return maxB - maxA;
    const ratioA = a.largura_mm / Math.max(1, a.altura_mm);
    const ratioB = b.largura_mm / Math.max(1, b.altura_mm);
    return Math.abs(ratioA - pocketRatio) - Math.abs(ratioB - pocketRatio);
  });

  return fitting;
}

// ---------------------------------------------------------------------------
// c) preencherPocket
// ---------------------------------------------------------------------------

/**
 * Tenta colocar até MAX_PIECES_PER_POCKET peças dentro do bolsão
 * usando mini-shelves (faixas horizontais).
 *
 * A rotação original de cada peça é preservada (sem re-rotação).
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

  for (const piece of candidates) {
    if (count >= MAX_PIECES_PER_POCKET) break;

    const pw = piece.largura_mm;
    const ph = piece.altura_mm;
    let placed = false;

    // Tentativa 1: posição actual na prateleira corrente
    if (
      curX + pw <= pocket.x + pocket.w + EPS &&
      curY + ph <= pocket.y + pocket.h + EPS &&
      !overlapsAny(curX, curY, pw, ph, localPlaced, kerf)
    ) {
      result.push({ ...piece, x_mm: curX, y_mm: curY, sheetIndex: destSheetIndex });
      localPlaced.push({ x: curX, y: curY, w: pw, h: ph });
      curX += pw + kerf;
      shelfH = Math.max(shelfH, ph);
      placed = true;
      count++;
    }

    // Tentativa 2: início de nova prateleira
    if (!placed && shelfH > 0) {
      const newY = curY + shelfH + kerf;
      const newX = pocket.x;
      if (
        newX + pw <= pocket.x + pocket.w + EPS &&
        newY + ph <= pocket.y + pocket.h + EPS &&
        !overlapsAny(newX, newY, pw, ph, localPlaced, kerf)
      ) {
        result.push({ ...piece, x_mm: newX, y_mm: newY, sheetIndex: destSheetIndex });
        localPlaced.push({ x: newX, y: newY, w: pw, h: ph });
        curX = newX + pw + kerf;
        curY = newY;
        shelfH = ph;
        placed = true;
        count++;
      }
    }

    if (!placed) break; // Sem espaço — parar para não desperdiçar ciclos
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

  for (let si = 0; si < totalSheets - 1; si++) {
    const relIndex = si / Math.max(1, totalSheets - 1);
    if (relIndex < lateIndexThr) continue;

    const destSheet = result[si];
    const sheetArea = Math.max(1, destSheet.sheet.largura_mm * destSheet.sheet.altura_mm);
    const usedArea = destSheet.placements.reduce((acc, p) => acc + p.largura_mm * p.altura_mm, 0);
    const wasteRatio = Math.max(0, (sheetArea - usedArea) / sheetArea);
    if (wasteRatio < wasteThr) continue;

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

        // Identificar peças movidas pela posição original (único por chapa/posição)
        const movedKeys = new Set(
          newPlacements.map((p) => `${p.boxId}::${p.partName}::${p.x_mm}::${p.y_mm}`)
        );
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
