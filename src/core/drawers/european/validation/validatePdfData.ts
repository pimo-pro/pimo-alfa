/**
 * validatePdfData.ts — Dados PDF Modelo B.
 */

import type { DrawerPDFSection, EuropeanDrawerHole, DrawerGeometry } from "../types";
import { euError, EU_ERROR_CODES } from "./errors";
import { emptyValidationResult, type EuropeanDrawerValidationResult } from "./types";

function isBlank(v: string | null | undefined): boolean {
  return v == null || String(v).trim() === "";
}

/**
 * Valida tabelas PDF (medidas, pecas, furos, notas).
 */
export function validatePdfData(
  pdf: DrawerPDFSection,
  geometry: DrawerGeometry,
  holes: EuropeanDrawerHole[]
): EuropeanDrawerValidationResult {
  const result = emptyValidationResult();

  for (const row of pdf.measureRows) {
    if (isBlank(row.label) || isBlank(row.value)) {
      result.errors.push(euError(EU_ERROR_CODES.PDF_NULL, "Linha de medidas PDF com valor nulo.", "pdf.measureRows"));
    }
    if (/-?\d+(\.\d+)?/.test(row.value) && row.value.includes("-") && /-\d/.test(row.value.replace(/\u2013/g, "-").replace(/\u2014/g, "-"))) {
      // valores negativos explicitos tipo "-5 mm"
      if (/:\s*-\d/.test(`${row.label}: ${row.value}`) || /^\s*-\d/.test(row.value)) {
        result.errors.push(euError(EU_ERROR_CODES.PDF_DIM, `Medida negativa no PDF: ${row.label}.`, "pdf.measureRows"));
      }
    }
  }

  for (const row of pdf.pieceRows) {
    if (isBlank(row.nome) || isBlank(row.qty) || isBlank(row.dims) || isBlank(row.material)) {
      result.errors.push(euError(EU_ERROR_CODES.PDF_NULL, "Linha de pecas PDF incompleta.", "pdf.pieceRows"));
    }
    if (row.dims.includes("-") && /-\d/.test(row.dims)) {
      result.errors.push(euError(EU_ERROR_CODES.PDF_DIM, `Peca PDF com dimensao negativa: ${row.nome}.`, "pdf.pieceRows"));
    }
  }

  if (holes.length > 0 && pdf.holeRows.length === 0) {
    result.errors.push(euError(EU_ERROR_CODES.PDF_HOLE, "PDF sem tabela de furos apesar de existirem furos.", "pdf.holeRows"));
  }

  for (const row of pdf.holeRows) {
    if (isBlank(row.peca) || isBlank(row.x) || isBlank(row.y) || isBlank(row.d) || isBlank(row.depth)) {
      result.errors.push(euError(EU_ERROR_CODES.PDF_NULL, "Linha de furos PDF com nulos.", "pdf.holeRows"));
    }
  }

  if (!pdf.notes || pdf.notes.length === 0) {
    result.errors.push(euError(EU_ERROR_CODES.PDF_NOTES, "PDF sem notas industriais.", "pdf.notes"));
  }

  // Coerencia minima com geometria
  if (geometry.front.widthMm <= 0) {
    result.errors.push(euError(EU_ERROR_CODES.PDF_DIM, "Geometria frente invalida para PDF.", "pdf"));
  }

  result.valid = result.errors.length === 0;
  return result;
}
