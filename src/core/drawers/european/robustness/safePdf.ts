/**
 * safePdf.ts — Filtra linhas PDF inválidas sem alterar layout.
 */

import type { DrawerPDFSection } from "../types";
import { ensureArray, robustDebug } from "./safeNumbers";

function hasNaNToken(text: string): boolean {
  return /NaN|Infinity|-Infinity/i.test(text);
}

function isMeasureRowOk(row: { label: string; value: string }): boolean {
  if (!row.label?.trim() || row.value == null || String(row.value).trim() === "") return false;
  return !hasNaNToken(String(row.value));
}

function isPieceRowOk(row: { nome: string; qty: string; dims: string; material: string }): boolean {
  if (!row.nome?.trim() || !row.dims?.trim()) return false;
  if (hasNaNToken(row.dims) || hasNaNToken(row.qty)) return false;
  const qty = Number(row.qty);
  if (!Number.isFinite(qty) || qty < 0) return false;
  return true;
}

function isHoleRowOk(row: {
  peca: string;
  x: string;
  y: string;
  d: string;
  depth: string;
  tipo: string;
}): boolean {
  if (!row.peca?.trim()) return false;
  for (const v of [row.x, row.y, row.d, row.depth]) {
    if (hasNaNToken(v) || !Number.isFinite(Number(v))) return false;
  }
  return true;
}

export function sanitizePdfSection(section: DrawerPDFSection): DrawerPDFSection {
  const measureRows = ensureArray(section.measureRows, "pdf.measureRows").filter((r) => {
    const ok = isMeasureRowOk(r);
    if (!ok) robustDebug("pdf", "linha medida omitida", r);
    return ok;
  });
  const pieceRows = ensureArray(section.pieceRows, "pdf.pieceRows").filter((r) => {
    const ok = isPieceRowOk(r);
    if (!ok) robustDebug("pdf", "linha peça omitida", r);
    return ok;
  });
  const holeRows = ensureArray(section.holeRows, "pdf.holeRows").filter((r) => {
    const ok = isHoleRowOk(r);
    if (!ok) robustDebug("pdf", "linha furo omitida", r);
    return ok;
  });

  return {
    ...section,
    title: section.title || "Gavetas Europeias",
    measureRows,
    pieceRows,
    holeRows,
    notes: ensureArray(section.notes, "pdf.notes"),
    explodedViewNotes: ensureArray(section.explodedViewNotes, "pdf.exploded"),
  };
}
