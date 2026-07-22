/**
 * Fase 5 — Merge documental whitelist da cutlist ? cutlist de etiquetas UEE.
 * Fase 6 — usa validadores partilhados; idempotente; prefix match por comprimento.
 *
 * Fonte única: overrides.cutlist.
 * Não aplica tecnico/outros docs. Não gera etiquetas para addedRows.
 * deletedRowIds omitem só a etiqueta (CNC intocado).
 * Dimensões / boxId / geometria / furos / orlas: bloqueados.
 */

import type { CutListItemComPreco } from "@/core/types";
import type { IndustrialDocumentOverridesStore } from "./industrialDocumentOverridesTypes";
import {
  isBlockedIndustrialAnalysisField,
  isPlaceholderDocumentaryValue,
  isValidIndustrialAnalysisMaterial,
  parseIndustrialAnalysisQty,
  sanitizeIndustrialAnalysisObservacoes,
} from "./industrialOnlineAnalysisValidation";

/** Campos documentais permitidos no ramo UEE. */
export const ETIQUETA_DOCUMENTARY_FIELD_WHITELIST = [
  "material",
  "qtd",
  "observacoes",
  "peca",
  "caixa",
] as const;

export type EtiquetaDocumentaryField = (typeof ETIQUETA_DOCUMENTARY_FIELD_WHITELIST)[number];

function stripPrefix(id: string, prefix?: string): string {
  if (!prefix) return id;
  return id.startsWith(prefix) ? id.slice(prefix.length) : id;
}

/**
 * Aplica overrides.cutlist (whitelist) a uma cópia dos items para UEE.
 * Items CNC/nesting devem continuar a usar a lista base (sem esta função).
 * Idempotente: apply(apply(x)) === apply(x) em conteúdo documental.
 */
export function applyDocumentaryOverridesToCutlistForEtiquetas(
  items: readonly CutListItemComPreco[],
  store: IndustrialDocumentOverridesStore | undefined,
  options?: { stripIdPrefix?: string }
): CutListItemComPreco[] {
  const cutlist = store?.cutlist;
  if (!cutlist) return items.map((item) => ({ ...item, dimensoes: { ...item.dimensoes } }));

  const deleted = new Set(cutlist.deletedRowIds ?? []);
  const patches = cutlist.rowPatches ?? {};
  const prefix = options?.stripIdPrefix;

  const out: CutListItemComPreco[] = [];

  for (const item of items) {
    const lookupId = stripPrefix(item.id, prefix);
    if (deleted.has(lookupId) || deleted.has(item.id)) {
      continue;
    }

    const patch = patches[lookupId] ?? patches[item.id];
    if (!patch?.fields) {
      out.push({
        ...item,
        dimensoes: { ...item.dimensoes },
        metadata: item.metadata ? { ...item.metadata } : item.metadata,
      });
      continue;
    }

    const fields = patch.fields;
    const next: CutListItemComPreco = {
      ...item,
      dimensoes: { ...item.dimensoes },
      metadata: { ...(item.metadata ?? {}) },
    };

    for (const [key, rawValue] of Object.entries(fields)) {
      if (isBlockedIndustrialAnalysisField(key)) continue;
      if (!(ETIQUETA_DOCUMENTARY_FIELD_WHITELIST as readonly string[]).includes(key)) continue;

      const value = String(rawValue ?? "");

      switch (key as EtiquetaDocumentaryField) {
        case "material": {
          if (!isValidIndustrialAnalysisMaterial(value)) break;
          next.material = value.trim();
          break;
        }
        case "qtd": {
          const qty = parseIndustrialAnalysisQty(value);
          if (qty != null) next.quantidade = qty;
          break;
        }
        case "observacoes": {
          if (isPlaceholderDocumentaryValue(value)) {
            next.metadata = { ...next.metadata, documentaryObservacoes: [] };
          } else {
            const obs = sanitizeIndustrialAnalysisObservacoes(value);
            next.metadata = {
              ...next.metadata,
              documentaryObservacoes: obs ? [obs] : [],
            };
          }
          break;
        }
        case "peca": {
          const peca = value.trim();
          if (!peca) break;
          next.metadata = { ...next.metadata, industrialLabel: peca };
          next.tipo = peca;
          break;
        }
        case "caixa": {
          next.metadata = {
            ...next.metadata,
            documentaryBoxNome: value.trim(),
          };
          break;
        }
        default:
          break;
      }
    }

    out.push(next);
  }

  return out;
}

/**
 * Multi-projeto: cada item prefixado usa os overrides do projeto de origem.
 * Prefixos mais longos tém prioridade (P10_ antes de P1_).
 */
export function applyMultiProjectDocumentaryOverridesForEtiquetas(
  items: readonly CutListItemComPreco[],
  entries: ReadonlyArray<{
    prefix: string;
    overrides: IndustrialDocumentOverridesStore | undefined;
  }>
): CutListItemComPreco[] {
  if (!entries.length) return items.map((item) => ({ ...item, dimensoes: { ...item.dimensoes } }));

  const sorted = [...entries].sort((a, b) => b.prefix.length - a.prefix.length);
  const out: CutListItemComPreco[] = [];

  for (const item of items) {
    const entry =
      sorted.find(
        (e) =>
          (item.id?.startsWith(e.prefix) ?? false) ||
          (item.boxId?.startsWith(e.prefix) ?? false)
      ) ?? null;

    if (!entry) {
      out.push({ ...item, dimensoes: { ...item.dimensoes } });
      continue;
    }

    const merged = applyDocumentaryOverridesToCutlistForEtiquetas([item], entry.overrides, {
      stripIdPrefix: entry.prefix,
    });
    out.push(...merged);
  }
  return out;
}
