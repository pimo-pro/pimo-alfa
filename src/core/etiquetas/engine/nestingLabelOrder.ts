import { readLabelNumberFromMetadata } from "../../qrcode/panelLabelNumber";
import { labelItemSheetKey, type LabelSheetPlacement } from "../qr/etiquetaCodeV5";

export type NestingLabelItemLike = {
  boxId?: string;
  nome?: string;
  id?: string;
  pieceNumber?: number;
  metadata?: Record<string, unknown>;
};

/**
 * Ordem de impressão: painel 1 → painel 2 → …
 * Dentro de cada painel, ordem exacta do array do nesting (sem sort espacial).
 */
export function nestingPlacementPrintOrder(
  placements: LabelSheetPlacement[]
): LabelSheetPlacement[] {
  return [...placements].sort((a, b) => {
    const sheetA = a.sheetIndex ?? 0;
    const sheetB = b.sheetIndex ?? 0;
    if (sheetA !== sheetB) return sheetA - sheetB;
    const idxA = a.placementIndex ?? a.globalPlacementIndex ?? 0;
    const idxB = b.placementIndex ?? b.globalPlacementIndex ?? 0;
    return idxA - idxB;
  });
}

function buildItemPools<T extends NestingLabelItemLike>(items: readonly T[]): Map<string, T[]> {
  const pools = new Map<string, T[]>();
  for (const item of items) {
    const key = labelItemSheetKey(item.boxId, item.nome);
    const list = pools.get(key) ?? [];
    list.push(item);
    pools.set(key, list);
  }
  return pools;
}

/**
 * Ordena etiquetas pela sequência real do nesting:
 * - Painéis em ordem crescente (0, 1, 2…)
 * - Dentro de cada painel, ordem do array de placements (sem reordenação por x/y)
 * - Peças idênticas emparelhadas por ordem de aparição
 */
export function orderLabelsByNestingPlacements<T extends NestingLabelItemLike>(
  items: T[],
  placements?: LabelSheetPlacement[]
): T[] {
  if (!placements || placements.length === 0) return [...items];

  const sequence = nestingPlacementPrintOrder(placements);
  const pools = buildItemPools(items);
  const used = new Set<T>();
  const ordered: T[] = [];

  for (const placement of sequence) {
    const key = labelItemSheetKey(placement.boxId, placement.partName);
    const pool = pools.get(key);
    if (!pool?.length) continue;
    const match = pool.find((item) => !used.has(item));
    if (!match) continue;
    used.add(match);
    ordered.push(match);
  }

  for (const item of items) {
    if (!used.has(item)) ordered.push(item);
  }

  return ordered;
}

const META_LABEL_KEYS = ["labelNumber", "LabelNumber", "qrNumber", "QRNumber"] as const;

function clearLegacyLabelMeta(metadata: Record<string, unknown>): Record<string, unknown> {
  const next = { ...metadata };
  for (const key of META_LABEL_KEYS) {
    delete next[key];
  }
  return next;
}

/**
 * Atribui número de etiqueta único (1..N) a cada peça ANTES da ordenação.
 * Sobrescreve qualquer pieceNumber/metadata legado que possa causar duplicação.
 */
export function assignUniqueEtiquetaNumbers<T extends NestingLabelItemLike>(items: T[]): void {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const seq = i + 1;
    item.pieceNumber = seq;
    item.metadata = {
      ...clearLegacyLabelMeta(item.metadata ?? {}),
      labelNumber: seq,
    };
  }
}

/** Garante que não existem números de etiqueta repetidos antes da impressão. */
export function assertUniqueEtiquetaNumbers<T extends NestingLabelItemLike>(items: readonly T[]): void {
  const seen = new Set<number>();
  for (const item of items) {
    const fromMeta = readLabelNumberFromMetadata(item.metadata);
    const fromPiece = Number(item.pieceNumber ?? 0);
    const n =
      fromMeta != null && fromMeta > 0
        ? fromMeta
        : Number.isFinite(fromPiece) && fromPiece > 0
          ? Math.floor(fromPiece)
          : null;

    if (n == null || n <= 0) {
      throw new Error("Etiqueta sem número único atribuído antes da impressão.");
    }
    if (seen.has(n)) {
      throw new Error(`Número de etiqueta duplicado detectado: ${n}`);
    }
    seen.add(n);
  }
}

/**
 * Pipeline de preparação: números únicos → ordenação pelo nesting → validação.
 * Deve ser chamado antes de renderizar qualquer PDF de etiquetas.
 */
export function prepareEtiquetasForPrint<T extends NestingLabelItemLike>(
  items: T[],
  placements?: LabelSheetPlacement[]
): T[] {
  assignUniqueEtiquetaNumbers(items);
  const ordered = orderLabelsByNestingPlacements(items, placements);
  assertUniqueEtiquetaNumbers(ordered);
  return ordered;
}
