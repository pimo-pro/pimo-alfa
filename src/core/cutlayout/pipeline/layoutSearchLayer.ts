/**
 * Layout Search Layer — Nesting Engine 2.3 (Layer 2)
 *
 * Orquestrador Layer 2 sobre o pipeline existente (Fase 7D: 1 ordenação area_desc).
 * O motor (runCutLayout) é caixa preta; freeze do 1.º sheet e métricas preservados.
 *
 * Critérios de seleção (por prioridade):
 *   1. Menor número de chapas
 *   2. Menor desperdício total (margem de tolerância: 0.5%)
 *   3. Menor desperdício médio por chapa
 *   4. Menos chapas com desperdício > 20%
 *
 * Puro: sem efeitos colaterais no pipeline. Não altera contratos de dados TCN.
 */

import type { CutPiece, CutPlacement, CutLayoutResult, SheetResult } from "../cutLayoutTypes";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface LayoutScenarioMetrics {
  totalWasteRatio: number;
  avgWasteRatio: number;
  sheetCount: number;
  /** Número de chapas com desperdício > 20%. */
  largeVoidCount: number;
}

export interface LayoutScenario {
  id: string;
  strategyName: string;
  /** Peças na ordem usada neste cenário — para re-executar com opções completas. */
  pieces: CutPiece[];
  /** Chapas do run de pesquisa rápida (sem meta-heurísticas). */
  sheets: SheetResult[];
  metrics: LayoutScenarioMetrics;
}

// ---------------------------------------------------------------------------
// Estratégia de ordenação Layer 2 (Fase 7D: só area_desc)
// ---------------------------------------------------------------------------

type SortFn = (pieces: CutPiece[]) => CutPiece[];

/** Área descendente: peças maiores primeiro. */
function stratAreaDesc(pieces: CutPiece[]): CutPiece[] {
  return [...pieces].sort(
    (a, b) =>
      b.largura_mm * b.altura_mm - a.largura_mm * a.altura_mm ||
      Math.max(b.largura_mm, b.altura_mm) - Math.max(a.largura_mm, a.altura_mm)
  );
}

/** Fase 7D: uma única estratégia (area_desc) — freeze + métricas inalterados. */
const LAYER2_STRATEGIES: Array<{ id: string; name: string; sort: SortFn }> = [
  { id: "A", name: "area_desc", sort: stratAreaDesc },
];

// ---------------------------------------------------------------------------
// SPM First-Sheet Freeze — utilitários internos
// ---------------------------------------------------------------------------

/**
 * Limiar de desperdício abaixo do qual o primeiro sheet é considerado "estável"
 * e elegível para congelamento. Padrão: 20%.
 */
const FREEZE_WASTE_THRESHOLD = 0.20;

/**
 * Chave de identificação de uma peça colocada, sem considerar posição.
 * Permite rastrear se a mesma peça aparece em múltiplos sheets.
 */
function pieceKey(p: CutPlacement): string {
  return `${p.boxId}::${p.partName}`;
}

/**
 * Constrói um multiset (chave → contagem) das peças num conjunto de placements.
 * Usado para rastrear quantas cópias de cada peça existem no sheet congelado.
 */
function buildPieceMultiset(placements: CutPlacement[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of placements) {
    const k = pieceKey(p);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/**
 * Calcula o rácio de desperdício de um único sheet.
 */
function sheetWasteRatio(s: SheetResult): number {
  const area = Math.max(1, s.sheet.largura_mm * s.sheet.altura_mm);
  const used = s.placements.reduce((acc, p) => acc + p.largura_mm * p.altura_mm, 0);
  return Math.max(0, (area - used) / area);
}

/**
 * Aplica o congelamento do primeiro sheet a um conjunto de chapas gerado por uma estratégia.
 *
 * Comportamento:
 *   1. Substitui `sheets[0]` pelo `frozenSheet0` (estado original intacto).
 *   2. Remove dos sheets 1+ quaisquer peças que pertenciam ao sheet congelado
 *      (usando o multiset para lidar correctamente com múltiplas cópias da mesma peça).
 *   3. Sheets 1+ que ficam vazios após remoção são descartados.
 *
 * @returns  Novo array de sheets com o freeze aplicado.
 */
function aplicarFreezeSheet0(
  sheets: SheetResult[],
  frozenSheet0: SheetResult,
  frozenMultiset: Map<string, number>
): { sheets: SheetResult[]; piecesRestored: number } {
  if (sheets.length === 0) {
    return { sheets: [frozenSheet0], piecesRestored: 0 };
  }

  // Sheet 0 é sempre o congelado — ignorar o que a estratégia produziu aqui
  const corrected: SheetResult[] = [
    { ...frozenSheet0, placements: [...frozenSheet0.placements] },
  ];

  // Para os sheets 1+: remover peças que já estão no sheet congelado
  // O `remaining` regista quantas cópias de cada peça ainda podem ser removidas
  const remaining = new Map(frozenMultiset);
  let piecesRestored = 0;

  for (let i = 1; i < sheets.length; i++) {
    const filteredPlacements = sheets[i].placements.filter((p) => {
      const k = pieceKey(p);
      const count = remaining.get(k) ?? 0;
      if (count > 0) {
        remaining.set(k, count - 1);
        piecesRestored++;
        return false; // Remover — já está no sheet congelado
      }
      return true; // Manter — peça exclusiva deste sheet
    });

    if (filteredPlacements.length > 0) {
      corrected.push({ ...sheets[i], placements: filteredPlacements });
    }
    // Sheets que ficaram vazios são simplesmente descartados (não adicionados)
  }

  return { sheets: corrected, piecesRestored };
}

// ---------------------------------------------------------------------------
// Cálculo de métricas
// ---------------------------------------------------------------------------

function calcularMetricas(sheets: SheetResult[]): LayoutScenarioMetrics {
  if (sheets.length === 0) {
    return { totalWasteRatio: 1, avgWasteRatio: 1, sheetCount: 0, largeVoidCount: 0 };
  }

  let totalArea = 0;
  let totalUsed = 0;
  const sheetWastes: number[] = [];

  for (const s of sheets) {
    const area = Math.max(1, s.sheet.largura_mm * s.sheet.altura_mm);
    const used = s.placements.reduce((acc, p) => acc + p.largura_mm * p.altura_mm, 0);
    totalArea += area;
    totalUsed += used;
    sheetWastes.push(Math.max(0, (area - used) / area));
  }

  return {
    totalWasteRatio: Math.max(0, (totalArea - totalUsed) / Math.max(1, totalArea)),
    avgWasteRatio: sheetWastes.reduce((a, b) => a + b, 0) / sheetWastes.length,
    sheetCount: sheets.length,
    largeVoidCount: sheetWastes.filter((w) => w > 0.20).length,
  };
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Gera cenários de layout (Fase 7D: 1 estratégia area_desc; freeze e métricas mantidos).
 * O `runner` é chamado com meta-heurísticas desativadas para manter velocidade.
 *
 * **SPM First-Sheet Freeze** (activado automaticamente):
 *   Antes do cenário area_desc, executa um run de baseline com a ordenação
 *   original das peças. Se o primeiro sheet do baseline tiver desperdício ≤ 20%,
 *   é marcado como "congelado". Durante a avaliação do cenário:
 *     1. O sheet 0 é sempre substituído pelo sheet congelado (preservando o layout ideal).
 *     2. Peças do sheet congelado colocadas noutros sheets são removidas dessas chapas.
 *     3. As métricas são calculadas sobre o resultado corrigido.
 *
 * @param pieces  Peças a distribuir (antes de expandPieces — quantidade pode ser > 1).
 * @param runner  Callback que executa o pipeline base para uma dada ordenação.
 *                Deve ter meta-heurísticas desativadas (passadas pelo chamador via options).
 */
export function gerarCenariosLayout(
  pieces: CutPiece[],
  runner: (pieces: CutPiece[]) => CutLayoutResult
): LayoutScenario[] {
  // ── SPM First-Sheet Freeze: fase de baseline ──────────────────────────────
  // Executa o pipeline com a ordenação original das peças para capturar o estado
  // natural do primeiro sheet antes de qualquer reordenação da Layer 2.
  let frozenSheet0: SheetResult | null = null;
  let frozenMultiset: Map<string, number> | null = null;

  try {
    const baseResult = runner([...pieces]); // ordenação original — sem sort
    if (baseResult.sheets.length > 0) {
      const s0 = baseResult.sheets[0];
      const waste = sheetWasteRatio(s0);
      if (waste <= FREEZE_WASTE_THRESHOLD) {
        frozenSheet0 = s0;
        frozenMultiset = buildPieceMultiset(s0.placements);
      }
    }
  } catch {
    // Baseline falhou — sem freeze; as estratégias correm normalmente
  }
  // ──────────────────────────────────────────────────────────────────────────

  const cenarios: LayoutScenario[] = [];

  for (const strategy of LAYER2_STRATEGIES) {
    const sortedPieces = strategy.sort(pieces);
    let result: CutLayoutResult;
    try {
      result = runner(sortedPieces);
    } catch {
      continue; // Ignora erros em estratégias individuais
    }
    if (result.sheets.length === 0) continue;

    // ── Aplicar SPM First-Sheet Freeze ──────────────────────────────────────
    // Se o freeze está ativo, substitui o sheet 0 pelo estado congelado e remove
    // as suas peças dos sheets subsequentes gerados por esta estratégia.
    let scenarioSheets = result.sheets;

    if (frozenSheet0 && frozenMultiset) {
      const { sheets: corrected } = aplicarFreezeSheet0(
        result.sheets,
        frozenSheet0,
        frozenMultiset
      );
      scenarioSheets = corrected;
    }
    // ──────────────────────────────────────────────────────────────────────

    const metrics = calcularMetricas(scenarioSheets);
    cenarios.push({
      id: strategy.id,
      strategyName: strategy.name,
      pieces: sortedPieces,
      sheets: scenarioSheets,
      metrics,
    });
  }

  return cenarios;
}

/**
 * Escolhe o melhor cenário de layout por:
 *   1. Menor número de chapas
 *   2. Menor desperdício total  (tolerância: 0.5%)
 *   3. Menor desperdício médio  (tolerância: 0.5%)
 *   4. Menos chapas com desperdício > 20%
 */
export function escolherMelhorCenario(cenarios: LayoutScenario[]): LayoutScenario {
  if (cenarios.length === 0) throw new Error("[LAYER2] Nenhum cenário disponível.");

  return cenarios.reduce((best, curr) => {
    const bm = best.metrics;
    const cm = curr.metrics;

    if (cm.sheetCount < bm.sheetCount) return curr;
    if (cm.sheetCount > bm.sheetCount) return best;

    if (cm.totalWasteRatio < bm.totalWasteRatio - 0.005) return curr;
    if (cm.totalWasteRatio > bm.totalWasteRatio + 0.005) return best;

    if (cm.avgWasteRatio < bm.avgWasteRatio - 0.005) return curr;
    if (cm.avgWasteRatio > bm.avgWasteRatio + 0.005) return best;

    return cm.largeVoidCount <= bm.largeVoidCount ? curr : best;
  });
}
