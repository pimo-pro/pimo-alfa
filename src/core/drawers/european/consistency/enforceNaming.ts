/**
 * enforceNaming.ts — Normalização central de identidade industrial.
 */

import {
  displayNameForBaseCode,
  isCanonicalEuropeanCode,
  resolveBaseCode,
  resolveIndexedCode,
  type EuropeanIndustrialBaseCode,
} from "./namingMap";

export type EuropeanPieceIdentityInput = {
  nome?: string;
  codigo?: string;
  tipo?: string;
  pieceRef?: string;
  label?: string;
  drawerIndex0?: number;
  drawerCount?: number;
};

export type EuropeanPieceIdentity = {
  nome: string;
  codigo: string;
  /** Sempre igual ao código industrial. */
  label: string;
  baseCode: EuropeanIndustrialBaseCode;
};

/**
 * Garante nome/código/label canúnicos.
 * Se o input vier errado de qualquer módulo ? corrige automaticamente.
 */
export function enforceNaming(piece: EuropeanPieceIdentityInput): EuropeanPieceIdentity | null {
  const drawerIndex0 = Math.max(0, Math.floor(piece.drawerIndex0 ?? 0));
  const drawerCount = Math.max(1, Math.floor(piece.drawerCount ?? 1));

  const candidates = [piece.codigo, piece.tipo, piece.pieceRef, piece.label, piece.nome];
  let base: EuropeanIndustrialBaseCode | null = null;
  for (const c of candidates) {
    base = resolveBaseCode(c);
    if (base) break;
  }
  if (!base) return null;

  // Se já veio código indexado canúnico, preservar
  let codigo = piece.codigo?.trim() ?? "";
  if (!isCanonicalEuropeanCode(codigo) || resolveBaseCode(codigo) !== base) {
    codigo = resolveIndexedCode(base, drawerIndex0, drawerCount);
  }

  const nome =
    base === "gav"
      ? displayNameForBaseCode("gav", drawerIndex0)
      : displayNameForBaseCode(base, drawerIndex0);

  return {
    nome,
    codigo,
    label: codigo,
    baseCode: base,
  };
}

/** Extrai índice 0-based a partir de id tipo eu-drawer-box-2 ou código gav_2_fren. */
export function inferDrawerIndexFromCodigo(codigo: string | undefined): number | undefined {
  if (!codigo) return undefined;
  const front = /^gav_(\d+)_fren$/.exec(codigo);
  if (front) return Math.max(0, Number(front[1]) - 1);
  const body = /^gav_(\d+)$/.exec(codigo);
  if (body) return Number(body[1]);
  if (codigo === "gav" || codigo === "gav_fren") return 0;
  return undefined;
}
