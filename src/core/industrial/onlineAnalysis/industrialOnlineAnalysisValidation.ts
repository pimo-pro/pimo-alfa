/**
 * Fase 6 - Validacoes industriais e sanitize de overrides documentais.
 */

import type { IndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";
import type {
  IndustrialDocumentOverride,
  IndustrialAddedRow,
} from "./industrialDocumentOverridesTypes";
import { emptyIndustrialDocumentOverride } from "./industrialDocumentOverridesTypes";
import type { IndustrialOnlineAnalysisTableSection } from "./industrialOnlineAnalysisViewTypes";

export const INDUSTRIAL_ANALYSIS_OBS_MAX_LEN = 240;

/** Keys nunca persistidas / nunca aplicadas a UEE via merge documental. */
export const INDUSTRIAL_ANALYSIS_BLOCKED_FIELD_KEYS = [
  "dimensoes",
  "largura",
  "altura",
  "profundidade",
  "espessura",
  "boxId",
  "id",
  "ref",
  "drillHoles",
  "orla",
  "perfil",
  "geometry",
  "furos",
] as const;

const BLOCKED = new Set<string>(INDUSTRIAL_ANALYSIS_BLOCKED_FIELD_KEYS);

export type IndustrialAnalysisFieldError = {
  rowId: string;
  fieldKey: string;
  message: string;
};

export type IndustrialAnalysisValidationResult = {
  ok: boolean;
  errors: IndustrialAnalysisFieldError[];
};

export function isPlaceholderDocumentaryValue(value: string): boolean {
  const t = String(value ?? "").trim();
  if (!t) return true;
  // ASCII hyphen and common unicode dashes (checked by codepoint to avoid encoding issues)
  if (t === "-") return true;
  if (t.length === 1) {
    const cp = t.codePointAt(0) ?? 0;
    // U+2014 EM DASH, U+2013 EN DASH, U+2212 MINUS SIGN
    if (cp === 0x2014 || cp === 0x2013 || cp === 0x2212) return true;
  }
  return false;
}

/** Qtd industrial: inteiro >= 1. */
export function parseIndustrialAnalysisQty(raw: string): number | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

export function isValidIndustrialAnalysisMaterial(raw: string): boolean {
  const t = String(raw ?? "").trim();
  if (!t) return false;
  if (isPlaceholderDocumentaryValue(t)) return false;
  return true;
}

export function sanitizeIndustrialAnalysisObservacoes(raw: string): string {
  return String(raw ?? "").trim().slice(0, INDUSTRIAL_ANALYSIS_OBS_MAX_LEN);
}

export function isBlockedIndustrialAnalysisField(key: string): boolean {
  return BLOCKED.has(key);
}

function validateCell(
  rowId: string,
  fieldKey: string,
  value: string,
  errors: IndustrialAnalysisFieldError[]
): void {
  if (isBlockedIndustrialAnalysisField(fieldKey)) {
    errors.push({
      rowId,
      fieldKey,
      message: `Campo proibido "${fieldKey}" nao pode ser editado.`,
    });
    return;
  }
  if (fieldKey === "qtd") {
    if (parseIndustrialAnalysisQty(value) == null) {
      errors.push({
        rowId,
        fieldKey,
        message: "Quantidade invalida (inteiro >= 1).",
      });
    }
    return;
  }
  if (fieldKey === "material") {
    if (!isValidIndustrialAnalysisMaterial(value)) {
      errors.push({
        rowId,
        fieldKey,
        message: "Material nao pode estar vazio.",
      });
    }
    return;
  }
  if (fieldKey === "observacoes") {
    if (String(value ?? "").length > INDUSTRIAL_ANALYSIS_OBS_MAX_LEN) {
      errors.push({
        rowId,
        fieldKey,
        message: `Observacoes: maximo ${INDUSTRIAL_ANALYSIS_OBS_MAX_LEN} caracteres.`,
      });
    }
  }
}

/**
 * Validacao rigida do draft antes de Guardar.
 * So valida linhas modificadas ou adicionadas (nao bloqueia placeholders canonico).
 */
export function validateIndustrialOnlineAnalysisDraft(
  _docId: IndustrialOnlineAnalysisDocId,
  draftSections: IndustrialOnlineAnalysisTableSection[]
): IndustrialAnalysisValidationResult {
  const errors: IndustrialAnalysisFieldError[] = [];

  for (const section of draftSections) {
    const editableKeys = new Set(
      section.columns.filter((c) => c.editable).map((c) => c.key)
    );
    for (const row of section.rows) {
      if (row.pendingDelete) continue;
      const isAdded = row.origin === "added" || row.rowId.startsWith("added:");
      const touched = new Set(row.modifiedFields ?? []);
      if (!isAdded && touched.size === 0) continue;

      const keysToCheck = isAdded
        ? [...editableKeys]
        : [...touched].filter((k) => editableKeys.has(k));

      for (const key of keysToCheck) {
        validateCell(row.rowId, key, row.cells[key] ?? "", errors);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function formatIndustrialAnalysisValidationErrors(
  errors: IndustrialAnalysisFieldError[]
): string {
  if (!errors.length) return "";
  const head = errors.slice(0, 5).map((e) => `${e.fieldKey}: ${e.message}`);
  const more = errors.length > 5 ? ` (+${errors.length - 5} erros)` : "";
  return `Guardar bloqueado - ${head.join(" | ")}${more}`;
}

function sanitizeFields(fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(fields)) {
    if (key === "__sectionId") {
      out[key] = raw;
      continue;
    }
    if (isBlockedIndustrialAnalysisField(key)) continue;
    if (key === "qtd") {
      const qty = parseIndustrialAnalysisQty(raw);
      if (qty == null) continue;
      out[key] = String(qty);
      continue;
    }
    if (key === "material") {
      const t = String(raw ?? "").trim();
      if (!isValidIndustrialAnalysisMaterial(t)) continue;
      out[key] = t;
      continue;
    }
    if (key === "observacoes") {
      out[key] = sanitizeIndustrialAnalysisObservacoes(raw);
      continue;
    }
    out[key] = typeof raw === "string" ? raw.trim() : String(raw ?? "");
  }
  return out;
}

/**
 * Remove keys bloqueadas, limpa patches em deletedRowIds, normaliza qtd/material/obs.
 */
export function sanitizeIndustrialDocumentOverride(
  override: IndustrialDocumentOverride | undefined
): IndustrialDocumentOverride {
  const src = override ?? emptyIndustrialDocumentOverride();
  const deletedRowIds = [...new Set(src.deletedRowIds ?? [])];
  const deleted = new Set(deletedRowIds);

  const rowPatches: IndustrialDocumentOverride["rowPatches"] = {};
  for (const [rowId, patch] of Object.entries(src.rowPatches ?? {})) {
    if (deleted.has(rowId)) continue;
    const fields = sanitizeFields(patch.fields ?? {});
    if (Object.keys(fields).length === 0) continue;
    rowPatches[rowId] = { ...patch, fields };
  }

  const addedRows: IndustrialAddedRow[] = (src.addedRows ?? []).map((row) => ({
    ...row,
    fields: sanitizeFields(row.fields ?? {}),
  }));

  return { rowPatches, addedRows, deletedRowIds };
}
