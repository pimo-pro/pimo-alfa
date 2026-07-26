/**
 * safetyPdfGate.ts — Bloqueia secções PDF incompletas / sem identidade.
 */

import type { DrawerPDFSection } from "../types";
import { isCanonicalEuropeanCode, resolveBaseCode } from "../consistency/namingMap";
import { finalizeGate, issue, type EuropeanSafetyGateResult } from "./safetyReport";

function parseLeadingNumber(raw: string): number | null {
  const m = /-?\d+(?:[.,]\d+)?/.exec(String(raw));
  if (!m) return null;
  const n = Number(m[0].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Gate de PDF: linhas incompletas, medidas negativas, nulos, identidade industrial.
 */
export function runSafetyPdfGate(pdf: DrawerPDFSection): EuropeanSafetyGateResult {
  const t0 = performance.now();
  const errors = [];
  const warnings = [];

  if (!pdf || typeof pdf.title !== "string") {
    errors.push(issue("pdf", "error", "PDF_NULL", "Secao PDF nula ou sem titulo"));
    return finalizeGate("pdf", t0, errors, warnings);
  }

  for (const row of pdf.measureRows ?? []) {
    if (row == null || row.label == null || row.value == null) {
      errors.push(issue("pdf", "error", "MEASURE_NULL", "Linha de medida com campos nulos"));
      continue;
    }
    const n = parseLeadingNumber(row.value);
    if (n != null && n < 0) {
      errors.push(
        issue("pdf", "error", "MEASURE_NEGATIVE", `Medida negativa: ${row.label}=${row.value}`)
      );
    }
  }

  for (const row of pdf.pieceRows ?? []) {
    if (row == null || !row.nome?.trim() || row.qty == null || row.dims == null || row.material == null) {
      errors.push(issue("pdf", "error", "PIECE_ROW_INCOMPLETE", "Linha de peca incompleta/nula"));
      continue;
    }
    const bracket = /\[([^\]]+)\]/.exec(row.nome);
    const code = bracket?.[1];
    if (!code) {
      if (/gav/i.test(row.nome) || /gaveta/i.test(row.nome)) {
        errors.push(
          issue(
            "pdf",
            "error",
            "PIECE_NO_INDUSTRIAL_ID",
            `Peca sem identificacao industrial: ${row.nome}`
          )
        );
      }
    } else if (code.startsWith("gav") && !isCanonicalEuropeanCode(code)) {
      errors.push(
        issue("pdf", "error", "PIECE_CODE_BAD", `Codigo PDF nao canonico: ${code}`, code)
      );
    }
    const qty = parseLeadingNumber(row.qty);
    if (qty != null && qty <= 0) {
      errors.push(issue("pdf", "error", "PIECE_QTY_BAD", `Qty invalida: ${row.qty}`, row.nome));
    }
  }

  for (const row of pdf.holeRows ?? []) {
    if (
      row == null ||
      !row.peca?.trim() ||
      row.x == null ||
      row.y == null ||
      row.d == null ||
      row.depth == null
    ) {
      errors.push(issue("pdf", "error", "HOLE_ROW_INCOMPLETE", "Linha de furo incompleta/nula"));
      continue;
    }
    for (const [label, raw] of [
      ["x", row.x],
      ["y", row.y],
      ["d", row.d],
      ["depth", row.depth],
    ] as const) {
      const n = parseLeadingNumber(raw);
      if (n != null && n < 0) {
        errors.push(issue("pdf", "error", "HOLE_NEG", `Campo ${label} negativo: ${raw}`, row.peca));
      }
      if (label === "d" && n != null && n < 0) {
        errors.push(issue("pdf", "error", "HOLE_DIA_BAD", `Diametro PDF negativo`, row.peca));
      }
      if (label === "d" && n === 0) {
        warnings.push(issue("pdf", "warning", "HOLE_DIA_ZERO", `Diametro PDF 0 (marcador)`, row.peca));
      }
    }
    if (
      !row.peca.startsWith("module_") &&
      resolveBaseCode(row.peca) == null &&
      !row.peca.includes("corred")
    ) {
      warnings.push(
        issue("pdf", "warning", "HOLE_PECA_UNKNOWN", `peca PDF desconhecida: ${row.peca}`, row.peca)
      );
    }
  }

  return finalizeGate("pdf", t0, errors, warnings);
}
