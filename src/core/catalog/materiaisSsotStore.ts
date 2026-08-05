/**
 * Estado runtime do SSOT de materiais (UI) — localStorage.
 * Não altera materials.api / CNC / nesting / TCN / cutlist / PI.
 */

import type { MateriaisSsotFreeagemRow, MateriaisSsotOrlaRow } from "./materiaisSsotTypes";
import type { MateriaisSsotChapaResolved } from "./materiaisSsotNormalize";

const STORAGE_KEY = "pimo_materiais_ssot_runtime_v1";
const ORLA_SSOT_KEY = "pimo_orla_ssot_presets_v1";
const FERRAGENS_SSOT_APPLIED_KEY = "pimo_ferragens"; // mesmo key do Admin

export type MateriaisSsotRuntimeEntry = {
  familia: string;
  displayLabel: string;
  ssotRef: string;
  industrialCanonicalId: string | null;
  espessuraMm: number | null;
  precoPorM2Eur: number | null;
  precoVendaPorM2Eur: number | null;
  precoChapaCompletaEur: number | null;
  medidaChapa: string;
};

export type MateriaisSsotRuntimeState = {
  appliedAt: string;
  byIndustrialId: Record<string, MateriaisSsotRuntimeEntry>;
  bySsotRef: Record<string, MateriaisSsotRuntimeEntry>;
  byFamily: Record<string, MateriaisSsotRuntimeEntry[]>;
  freeagens: MateriaisSsotFreeagemRow[];
  orla: MateriaisSsotOrlaRow[];
};

function emptyState(): MateriaisSsotRuntimeState {
  return {
    appliedAt: "",
    byIndustrialId: {},
    bySsotRef: {},
    byFamily: {},
    freeagens: [],
    orla: [],
  };
}

let memory: MateriaisSsotRuntimeState | null = null;

export function getMateriaisSsotRuntime(): MateriaisSsotRuntimeState {
  if (memory) return memory;
  if (typeof localStorage === "undefined") {
    memory = emptyState();
    return memory;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memory = emptyState();
      return memory;
    }
    const parsed = JSON.parse(raw) as MateriaisSsotRuntimeState;
    memory = {
      ...emptyState(),
      ...parsed,
      byIndustrialId: parsed.byIndustrialId ?? {},
      bySsotRef: parsed.bySsotRef ?? {},
      byFamily: parsed.byFamily ?? {},
      freeagens: Array.isArray(parsed.freeagens) ? parsed.freeagens : [],
      orla: Array.isArray(parsed.orla) ? parsed.orla : [],
    };
    return memory;
  } catch {
    memory = emptyState();
    return memory;
  }
}

export function saveMateriaisSsotRuntime(state: MateriaisSsotRuntimeState): void {
  memory = state;
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function buildRuntimeFromResolved(
  chapas: MateriaisSsotChapaResolved[],
  freeagens: MateriaisSsotFreeagemRow[],
  orla: MateriaisSsotOrlaRow[]
): MateriaisSsotRuntimeState {
  const byIndustrialId: Record<string, MateriaisSsotRuntimeEntry> = {};
  const bySsotRef: Record<string, MateriaisSsotRuntimeEntry> = {};
  const byFamily: Record<string, MateriaisSsotRuntimeEntry[]> = {};

  for (const row of chapas) {
    const entry: MateriaisSsotRuntimeEntry = {
      familia: row.familia,
      displayLabel: row.displayLabel,
      ssotRef: row.ref,
      industrialCanonicalId: row.industrialCanonicalId,
      espessuraMm: row.espessuraMm,
      precoPorM2Eur: row.precoPorM2Eur,
      precoVendaPorM2Eur: row.precoVendaPorM2Eur,
      precoChapaCompletaEur: row.precoChapaCompletaEur,
      medidaChapa: row.medidaChapa,
    };
    if (row.ref) bySsotRef[row.ref] = entry;
    if (row.industrialCanonicalId) byIndustrialId[row.industrialCanonicalId] = entry;
    if (row.familia) {
      if (!byFamily[row.familia]) byFamily[row.familia] = [];
      byFamily[row.familia]!.push(entry);
    }
  }

  return {
    appliedAt: new Date().toISOString(),
    byIndustrialId,
    bySsotRef,
    byFamily,
    freeagens,
    orla,
  };
}

/** Família UI a partir de REF industrial ou SSOT. */
export function getSsotFamiliaForMaterialId(materialIdOrLabel: string): string | null {
  const id = String(materialIdOrLabel ?? "").trim();
  if (!id) return null;
  const rt = getMateriaisSsotRuntime();
  const byInd = rt.byIndustrialId[id];
  if (byInd?.familia) return byInd.familia;
  const byRef = rt.bySsotRef[id];
  if (byRef?.familia) return byRef.familia;
  const lower = id.toLowerCase();
  for (const [canon, entry] of Object.entries(rt.byIndustrialId)) {
    if (canon.toLowerCase() === lower && entry.familia) return entry.familia;
  }
  return null;
}

export function getSsotEntryForMaterialId(materialIdOrLabel: string): MateriaisSsotRuntimeEntry | null {
  const id = String(materialIdOrLabel ?? "").trim();
  if (!id) return null;
  const rt = getMateriaisSsotRuntime();
  return rt.byIndustrialId[id] ?? rt.bySsotRef[id] ?? null;
}

export const MATERIAIS_SSOT_ORLA_STORAGE_KEY = ORLA_SSOT_KEY;
export const MATERIAIS_SSOT_FERRAGENS_STORAGE_KEY = FERRAGENS_SSOT_APPLIED_KEY;
