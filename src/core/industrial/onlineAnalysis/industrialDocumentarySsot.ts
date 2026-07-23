/**
 * Cutlist e técnico são duas vistas do mesmo SSOT documental.
 * Overrides e rowIds estáveis partilham a chave `cutlist`.
 */
import type {
  IndustrialDocumentOverride,
  IndustrialDocumentOverridesStore,
} from "./industrialDocumentOverridesTypes";
import type { IndustrialOnlineAnalysisDocId } from "./industrialOnlineAnalysisDocs";

/** DocId onde vivem patches documentais da lista de corte (cutlist + técnico). */
export function getDocumentaryOverrideDocId(
  docId: IndustrialOnlineAnalysisDocId
): IndustrialOnlineAnalysisDocId {
  if (docId === "tecnico") return "cutlist";
  return docId;
}

export function isCutlistSsotDocId(docId: IndustrialOnlineAnalysisDocId): boolean {
  return docId === "cutlist" || docId === "tecnico";
}

/**
 * Resolve o override documental (cutlist SSOT).
 * Fallback legado: patches gravados sob `tecnico` antes da unificação.
 */
export function resolveDocumentaryOverride(
  store: IndustrialDocumentOverridesStore | undefined,
  docId: IndustrialOnlineAnalysisDocId
): IndustrialDocumentOverride | undefined {
  if (!store) return undefined;
  const key = getDocumentaryOverrideDocId(docId);
  const primary = store[key];
  if (primary) return primary;
  if (key === "cutlist" && store.tecnico) return store.tecnico;
  return undefined;
}

/** Prefixo legado de rowId gerado com namespace `tecnico` (antes do SSOT único). */
export function legacyTecnicoRowIdAlias(cutlistRowId: string): string | null {
  if (!cutlistRowId.startsWith("c:cutlist:")) return null;
  return `c:tecnico:${cutlistRowId.slice("c:cutlist:".length)}`;
}
