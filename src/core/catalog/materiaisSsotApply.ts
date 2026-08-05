/**
 * Aplica o catálogo SSOT Excel à camada de UI (CRUD materiais, ferragens, orla, agrupamento).
 * Não altera materials.api, CNC, nesting, TCN, cutlist ou PI.
 */

import type { Ferragem } from "../ferragens/ferragens";
import { FERRAGENS_DEFAULT } from "../ferragens/ferragens";
import type { MaterialRecord } from "../materials/types";
import { listMaterials, writeMaterialsCrudSnapshot } from "../materials/service";
import type { OrlaPreset } from "../orla/orlaTypes";
import { DEFAULT_ORLA_PRESETS } from "../orla/orlaPresets";
import {
  loadMateriaisSsotFromUrl,
  parseMateriaisSsotWorkbook,
} from "./materiaisSsotReader";
import { MATERIAIS_SSOT_PUBLIC_PATH, type MateriaisSsotCatalog } from "./materiaisSsotTypes";
import {
  parseMedidaChapaMm,
  resolveSsotChapas,
} from "./materiaisSsotNormalize";
import {
  buildRuntimeFromResolved,
  MATERIAIS_SSOT_ORLA_STORAGE_KEY,
  saveMateriaisSsotRuntime,
} from "./materiaisSsotStore";

export type MateriaisSsotApplyResult = {
  ok: boolean;
  chapasResolved: number;
  chapasComIndustrial: number;
  materialsUpdated: number;
  materialsCreated: number;
  freeagensUpdated: number;
  orlaUpdated: number;
  error?: string;
};

function categoryFromFamilia(familia: string): string {
  const lower = familia.toLowerCase();
  if (lower.includes("mdf")) return "mdf";
  if (lower.includes("hdf") || lower.includes("carvalho") || lower.includes("nogueira") || lower.includes("lacado")) {
    return lower.includes("lacado") ? "lacado" : "carvalho";
  }
  if (lower.includes("agl") || lower.includes("linho")) return "industrial";
  return "outros";
}

function syncMaterialsCrud(
  resolved: ReturnType<typeof resolveSsotChapas>
): { updated: number; created: number } {
  const list = [...listMaterials()];
  let updated = 0;
  let created = 0;

  for (const row of resolved) {
    if (!row.industrialCanonicalId && !row.ref) continue;
    const medida = parseMedidaChapaMm(row.medidaChapa);
    const esp = row.espessuraMm ?? undefined;
    const preco =
      row.precoPorM2Eur != null && Number.isFinite(row.precoPorM2Eur)
        ? row.precoPorM2Eur
        : undefined;

    const matchIdx = list.findIndex((m) => {
      const ind = (m.industrialMaterialId ?? "").trim();
      if (row.industrialCanonicalId && ind === row.industrialCanonicalId) return true;
      if (row.ref && (m.id === row.ref || ind === row.ref)) return true;
      if (row.displayLabel && (m.label ?? "").trim().toLowerCase() === row.displayLabel.toLowerCase()) {
        return true;
      }
      return false;
    });

    if (matchIdx >= 0) {
      const cur = list[matchIdx]!;
      const next: MaterialRecord = {
        ...cur,
        label: row.displayLabel || cur.label,
        categoryId: cur.categoryId || categoryFromFamilia(row.familia),
        espessura: esp ?? cur.espessura,
        sheetThicknessMm: esp ?? cur.sheetThicknessMm,
        precoPorM2: preco ?? cur.precoPorM2,
        precoVendaPorM2:
          row.precoVendaPorM2Eur != null && Number.isFinite(row.precoVendaPorM2Eur)
            ? row.precoVendaPorM2Eur
            : cur.precoVendaPorM2,
        sheetWidthMm: medida?.widthMm ?? cur.sheetWidthMm,
        sheetHeightMm: medida?.heightMm ?? cur.sheetHeightMm,
        // Mantém ID industrial existente; se vazio e há match oficial, preenche.
        industrialMaterialId:
          cur.industrialMaterialId?.trim() ||
          row.industrialCanonicalId ||
          undefined,
      };
      list[matchIdx] = next;
      updated++;
      continue;
    }

    // Só cria no CRUD UI se houver ligação industrial (não inventa variantes CNC).
    if (!row.industrialCanonicalId) continue;

    const record: MaterialRecord = {
      id: `ssot_${row.industrialCanonicalId}`,
      label: row.displayLabel,
      categoryId: categoryFromFamilia(row.familia),
      espessura: esp,
      sheetThicknessMm: esp,
      precoPorM2: preco ?? 0,
      precoVendaPorM2:
        row.precoVendaPorM2Eur != null && Number.isFinite(row.precoVendaPorM2Eur)
          ? row.precoVendaPorM2Eur
          : undefined,
      sheetWidthMm: medida?.widthMm ?? 2800,
      sheetHeightMm: medida?.heightMm ?? 2070,
      industrialMaterialId: row.industrialCanonicalId,
    };
    list.push(record);
    created++;
  }

  writeMaterialsCrudSnapshot(list);
  return { updated, created };
}

function syncFerragens(catalog: MateriaisSsotCatalog): number {
  if (typeof localStorage === "undefined") return 0;
  let current: Ferragem[] = [];
  try {
    const raw = localStorage.getItem("pimo_ferragens");
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) current = parsed as Ferragem[];
    }
  } catch {
    current = [];
  }
  if (current.length === 0) current = [...FERRAGENS_DEFAULT];

  let updated = 0;
  const byId = new Map(current.map((f) => [f.id, f]));
  for (const row of catalog.freeagens) {
    const id = row.ref.trim();
    if (!id) continue;
    const existing = byId.get(id);
    if (!existing) continue;
    const next: Ferragem = {
      ...existing,
      nome: row.nome.trim() || existing.nome,
      medidas: row.espessuraOuMedida.trim() || existing.medidas,
      precoUnitario:
        row.precoPorUnidadeEur != null && Number.isFinite(row.precoPorUnidadeEur)
          ? row.precoPorUnidadeEur
          : existing.precoUnitario,
    };
    byId.set(id, next);
    updated++;
  }
  const nextList = [...byId.values()];
  try {
    localStorage.setItem("pimo_ferragens", JSON.stringify(nextList));
  } catch {
    /* ignore */
  }
  return updated;
}

function syncOrla(catalog: MateriaisSsotCatalog): number {
  if (typeof localStorage === "undefined") return 0;
  const base = DEFAULT_ORLA_PRESETS.map((p) => ({ ...p }));
  let updated = 0;
  const byId = new Map(base.map((p) => [p.id, p]));
  for (const row of catalog.orla) {
    const id = row.ref.trim();
    if (!id) continue;
    const existing = byId.get(id);
    if (!existing) continue;
    const next: OrlaPreset = {
      ...existing,
      nome: row.nome.trim() || existing.nome,
      espessuraMm:
        row.espessuraMm != null && row.espessuraMm > 0 ? row.espessuraMm : existing.espessuraMm,
      precoPorMetro:
        row.precoPorMetroEur != null && Number.isFinite(row.precoPorMetroEur)
          ? row.precoPorMetroEur
          : existing.precoPorMetro,
      precoPorRolo:
        row.precoPorRoloEur != null && Number.isFinite(row.precoPorRoloEur)
          ? row.precoPorRoloEur
          : existing.precoPorRolo,
    };
    byId.set(id, next);
    updated++;
  }
  const list = [...byId.values()];
  try {
    localStorage.setItem(MATERIAIS_SSOT_ORLA_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return updated;
}

/** Aplica um catálogo já parseado à UI. */
export function applyMateriaisSsotCatalog(catalog: MateriaisSsotCatalog): MateriaisSsotApplyResult {
  try {
    const resolved = resolveSsotChapas(catalog);
    const runtime = buildRuntimeFromResolved(resolved, catalog.freeagens, catalog.orla);
    saveMateriaisSsotRuntime(runtime);
    const mats = syncMaterialsCrud(resolved);
    const freeagensUpdated = syncFerragens(catalog);
    const orlaUpdated = syncOrla(catalog);
    return {
      ok: true,
      chapasResolved: resolved.length,
      chapasComIndustrial: resolved.filter((r) => r.industrialCanonicalId).length,
      materialsUpdated: mats.updated,
      materialsCreated: mats.created,
      freeagensUpdated,
      orlaUpdated,
    };
  } catch (e) {
    return {
      ok: false,
      chapasResolved: 0,
      chapasComIndustrial: 0,
      materialsUpdated: 0,
      materialsCreated: 0,
      freeagensUpdated: 0,
      orlaUpdated: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Carrega o Excel público e aplica à UI. */
export async function applyMateriaisSsotFromPublicUrl(
  url: string = MATERIAIS_SSOT_PUBLIC_PATH
): Promise<MateriaisSsotApplyResult> {
  try {
    const catalog = await loadMateriaisSsotFromUrl(url);
    return applyMateriaisSsotCatalog(catalog);
  } catch (e) {
    return {
      ok: false,
      chapasResolved: 0,
      chapasComIndustrial: 0,
      materialsUpdated: 0,
      materialsCreated: 0,
      freeagensUpdated: 0,
      orlaUpdated: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Aplica a partir de um ArrayBuffer (ex.: upload Admin). */
export async function applyMateriaisSsotFromBuffer(
  data: ArrayBuffer | Uint8Array
): Promise<MateriaisSsotApplyResult> {
  try {
    const catalog = await parseMateriaisSsotWorkbook(data);
    return applyMateriaisSsotCatalog(catalog);
  } catch (e) {
    return {
      ok: false,
      chapasResolved: 0,
      chapasComIndustrial: 0,
      materialsUpdated: 0,
      materialsCreated: 0,
      freeagensUpdated: 0,
      orlaUpdated: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
