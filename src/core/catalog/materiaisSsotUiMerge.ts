/**
 * Merge UI: espessuras CRUD extra nas famílias SSOT (grelha Admin).
 * Não cria IDs industriais nem altera CNC / nesting / TCN / cutlist / PI.
 */

import {
  getMaterialEspessuraMm,
  toMaterialPadronizado,
} from "../../components/settings/material/materialGrouping";
import { getSsotFamiliaForMaterialId } from "./materiaisSsotStore";
import type { MateriaisSsotChapaResolved, MateriaisSsotFamiliaGrupo } from "./materiaisSsotNormalize";
import { stripEspessuraFromFamilia } from "./materiaisSsotNormalize";

type MaterialLike = {
  id: string;
  label: string;
  espessura?: number;
  industrialMaterialId?: string;
  precoPorM2?: number;
  precoVendaPorM2?: number;
  sheetWidthMm?: number;
  sheetHeightMm?: number;
};

function normalizeFam(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Família UI de um registo CRUD (SSOT runtime → label sem espessura → mapeamento). */
export function resolveFamiliaForCrudMaterial(m: MaterialLike): string {
  const fromSsot =
    (m.industrialMaterialId
      ? getSsotFamiliaForMaterialId(m.industrialMaterialId)
      : null) ||
    getSsotFamiliaForMaterialId(m.id) ||
    null;
  if (fromSsot?.trim()) return stripEspessuraFromFamilia(fromSsot) || fromSsot.trim();

  const fromLabel = stripEspessuraFromFamilia(m.label ?? "");
  if (fromLabel) return fromLabel;

  const pad = toMaterialPadronizado(m.label ?? "", {
    id: m.id,
    industrialMaterialId: m.industrialMaterialId,
  });
  return stripEspessuraFromFamilia(pad) || pad.trim();
}

function crudToResolvedRow(m: MaterialLike, familia: string): MateriaisSsotChapaResolved {
  const esp = getMaterialEspessuraMm(m);
  const w = Number(m.sheetWidthMm);
  const h = Number(m.sheetHeightMm);
  const medida =
    Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0 ? `${w} x ${h}` : "";
  const displayLabel =
    familia && esp > 0 ? `${familia} ${esp}` : (m.label ?? familia).trim();
  return {
    nomeAtual: m.label ?? "",
    nomeNovoPadronizado: familia,
    ref: m.id,
    espessuraMm: esp > 0 ? esp : null,
    medidaChapa: medida,
    precoChapaCompletaEur: null,
    precoPorM2Eur:
      m.precoPorM2 != null && Number.isFinite(Number(m.precoPorM2))
        ? Number(m.precoPorM2)
        : null,
    precoVendaPorM2Eur:
      m.precoVendaPorM2 != null && Number.isFinite(Number(m.precoVendaPorM2))
        ? Number(m.precoVendaPorM2)
        : null,
    familia,
    industrialCanonicalId: null,
    displayLabel,
  };
}

/**
 * Acrescenta às famílias SSOT espessuras do CRUD que ainda não existem no Excel.
 * Em caso de conflito de espessura, mantém a linha SSOT.
 */
export function mergeCrudEspessurasIntoSsotGrupos(
  grupos: MateriaisSsotFamiliaGrupo[],
  materials: MaterialLike[]
): MateriaisSsotFamiliaGrupo[] {
  if (!grupos.length || !materials.length) return grupos;

  const byFamNorm = new Map<string, MateriaisSsotFamiliaGrupo>();
  for (const g of grupos) {
    byFamNorm.set(normalizeFam(g.familia), {
      familia: g.familia,
      espessuras: [...g.espessuras],
    });
  }

  const findGrupo = (familiaHint: string): MateriaisSsotFamiliaGrupo | undefined => {
    const key = normalizeFam(familiaHint);
    const direct = byFamNorm.get(key);
    if (direct) return direct;
    for (const [k, g] of byFamNorm) {
      if (key === k || key.startsWith(`${k} `) || k.startsWith(`${key} `)) return g;
    }
    return undefined;
  };

  for (const m of materials) {
    const familiaHint = resolveFamiliaForCrudMaterial(m);
    if (!familiaHint) continue;
    const grupo = findGrupo(familiaHint);
    if (!grupo) continue;

    const esp = getMaterialEspessuraMm(m);
    if (!(esp > 0)) continue;

    const already = grupo.espessuras.some(
      (r) => r.espessuraMm != null && Number(r.espessuraMm) === esp
    );
    if (already) continue;

    grupo.espessuras.push(crudToResolvedRow(m, grupo.familia));
  }

  return [...byFamNorm.values()]
    .map((g) => ({
      familia: g.familia,
      espessuras: [...g.espessuras].sort(
        (a, b) => (a.espessuraMm ?? 0) - (b.espessuraMm ?? 0)
      ),
    }))
    .sort((a, b) => a.familia.localeCompare(b.familia, "pt", { sensitivity: "base" }));
}
