/**
 * Código de etiqueta v5: [NOME_INDUSTRIAL]_[SIGLA][NUM_CAIXA]-[SEQ]
 * Motor QR canónico do UnifiedEtiquetaEngine (UEE).
 */

import { buildV5BottomStripIndustrialName } from "../industrialDisplayName";

export interface EtiquetaCodeV5Input {
  projectName: string;
  pieceSeq: number;
  totalPiecesInSheet: number;
  /** Nome de exibição da caixa — necessário para prefixo industrial completo. */
  boxName?: string;
  /** Nome industrial da peça (PRO ou metadata.industrialLabel). */
  nomeIndustrial?: string;
}

/** Chave de lookup alinhada a orderByCutLayoutPro em pdfEtiquetas. */
export function labelItemSheetKey(boxId: string | undefined, pieceName: string | undefined): string {
  return `${boxId ?? ""}::${pieceName ?? ""}`;
}

/**
 * Primeira letra de cada palavra (espaço ou _), maiúscula, até 11 caracteres alfanuméricos.
 */
export function extractProjectSigla(projectName: string): string {
  const raw = String(projectName ?? "").trim();
  if (!raw) return "X";

  const parts = raw.split(/[\s_]+/).filter(Boolean);
  let sigla = "";
  for (const part of parts) {
    const cleaned = part.replace(/[^a-zA-Z0-9]/g, "");
    if (!cleaned) continue;
    sigla += cleaned.charAt(0).toUpperCase();
    if (sigla.length >= 11) break;
  }

  const alnum = sigla.replace(/[^A-Z0-9]/g, "");
  return alnum.length > 0 ? alnum.slice(0, 11) : "X";
}

export function formatNumCaixa(totalPiecesInSheet: number): string {
  const n = Math.floor(Number(totalPiecesInSheet));
  if (!Number.isFinite(n) || n <= 0) return "00";
  const clamped = Math.min(99, n);
  return String(clamped).padStart(2, "0");
}

export function buildEtiquetaCodeV5(input: EtiquetaCodeV5Input): string {
  const sigla = extractProjectSigla(input.projectName);
  const numCaixa = formatNumCaixa(input.totalPiecesInSheet);
  const seq = Math.max(1, Math.floor(Number(input.pieceSeq) || 1));
  const suffix = `${sigla}${numCaixa}-${seq}`;

  const nomeIndustrial = String(input.nomeIndustrial ?? "").trim();
  if (!nomeIndustrial) {
    return suffix;
  }

  const industrialFullName = buildV5BottomStripIndustrialName(
    input.projectName,
    input.boxName ?? "",
    nomeIndustrial
  );
  return `${industrialFullName}_${suffix}`;
}

export interface EtiquetaQrPayloadV5Input {
  /** Nome industrial completo da peça (ex.: ANTONIO_NOVO_5_CC4_REMATE_L_B_01). */
  industrialPieceRef: string;
  pieceSeq: number;
}

/**
 * Payload QR v5 — nome industrial completo + número da etiqueta.
 * Ex.: ANTONIO_NOVO_5_CC4_REMATE_L_B_01-6
 */
export function buildEtiquetaQrPayloadV5(input: EtiquetaQrPayloadV5Input): string {
  const base = String(input.industrialPieceRef ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const seq = Math.max(1, Math.floor(Number(input.pieceSeq) || 1));
  return `${base || "PECA"}-${seq}`;
}

export type LabelSheetPlacement = {
  partName: string;
  boxId: string;
  sheetIndex: number;
  x_mm: number;
  y_mm: number;
};

export type LabelItemLike = {
  boxId?: string;
  nome?: string;
};

function hasBoxId(boxId: string | undefined): boolean {
  return String(boxId ?? "").trim().length > 0;
}

function normalizedBoxKey(boxId: string | undefined): string {
  return String(boxId ?? "").trim();
}

function normalizedNomeKey(nome: string | undefined): string {
  const n = String(nome ?? "").trim();
  return n.length > 0 ? n : "__unnamed__";
}

function countItemsByBox(items: LabelItemLike[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!hasBoxId(item.boxId)) continue;
    const boxKey = normalizedBoxKey(item.boxId);
    counts.set(boxKey, (counts.get(boxKey) ?? 0) + 1);
  }
  return counts;
}

function countItemsByNome(items: LabelItemLike[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (hasBoxId(item.boxId)) continue;
    const nomeKey = normalizedNomeKey(item.nome);
    counts.set(nomeKey, (counts.get(nomeKey) ?? 0) + 1);
  }
  return counts;
}

export function buildPiecesPerSheetMap(
  items: LabelItemLike[],
  placements?: LabelSheetPlacement[]
): Map<string, number> {
  const result = new Map<string, number>();

  if (placements && placements.length > 0) {
    const itemToSheet = new Map<string, number>();
    for (const p of placements) {
      const key = labelItemSheetKey(p.boxId, p.partName);
      if (!itemToSheet.has(key)) itemToSheet.set(key, p.sheetIndex);
    }

    const sheetCounts = new Map<number, number>();
    for (const item of items) {
      const key = labelItemSheetKey(item.boxId, item.nome);
      const sheetIdx = itemToSheet.get(key);
      if (sheetIdx === undefined) continue;
      sheetCounts.set(sheetIdx, (sheetCounts.get(sheetIdx) ?? 0) + 1);
    }

    const byBox = countItemsByBox(items);

    for (const item of items) {
      const key = labelItemSheetKey(item.boxId, item.nome);
      const sheetIdx = itemToSheet.get(key);
      if (sheetIdx !== undefined) {
        result.set(key, sheetCounts.get(sheetIdx) ?? 0);
      } else if (hasBoxId(item.boxId)) {
        result.set(key, byBox.get(normalizedBoxKey(item.boxId)) ?? 0);
      } else {
        result.set(key, 0);
      }
    }
    return result;
  }

  const byBox = countItemsByBox(items);
  const byNome = countItemsByNome(items);

  for (const item of items) {
    const key = labelItemSheetKey(item.boxId, item.nome);
    if (hasBoxId(item.boxId)) {
      result.set(key, byBox.get(normalizedBoxKey(item.boxId)) ?? 0);
    } else {
      result.set(key, byNome.get(normalizedNomeKey(item.nome)) ?? 0);
    }
  }
  return result;
}
