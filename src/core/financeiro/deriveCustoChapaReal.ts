/**
 * Deriva custoChapaReal a partir dos €/m² já usados em Painéis.
 * Sem novos campos de tarifa — SSOT: getPrecoPorMaterial × área da chapa padrão.
 */

import type { CutListItemComPreco } from "../types";
import { getPrecoPorMaterial } from "../pricing/pricing";
import { getSheetDefinitionFromSettings } from "../cnc/cncPipeline";
import { CHAPA_PADRAO_ALTURA, CHAPA_PADRAO_LARGURA } from "../manufacturing/materials";

export type DeriveCustoChapaRealResult = {
  custoChapaReal: number;
  eurM2: number;
  sheetAreaM2: number;
  materialKey: string;
  espessuraMm: number;
  warnings: string[];
};

function pieceAreaMm2(item: CutListItemComPreco): number {
  const w = item.dimensoes?.largura ?? 0;
  const h = item.dimensoes?.altura ?? 0;
  const qty = item.quantidade ?? 1;
  if (w <= 0 || h <= 0) return 0;
  return w * h * qty;
}

/** Material dominante por área de cutlist (alinhado ao consumo de Painéis). */
export function resolveDominantMaterialFromCutlist(cutlist: CutListItemComPreco[]): {
  materialKey: string;
  espessuraMm: number;
} {
  const byKey = new Map<string, { area: number; esp: number; material: string }>();
  for (const item of cutlist) {
    const material = String(item.material ?? item.materialId ?? "").trim();
    if (!material) continue;
    const esp = Number(item.espessura ?? item.dimensoes?.profundidade) || 19;
    const area = pieceAreaMm2(item);
    if (!(area > 0)) continue;
    const key = `${material}::${esp}`;
    const prev = byKey.get(key);
    if (prev) prev.area += area;
    else byKey.set(key, { area, esp, material });
  }
  let best: { area: number; esp: number; material: string } | null = null;
  for (const row of byKey.values()) {
    if (!best || row.area > best.area) best = row;
  }
  return {
    materialKey: best?.material ?? "",
    espessuraMm: best?.esp ?? 19,
  };
}

/**
 * custoChapaReal = preço_m2_material × área_da_chapa_padrão.
 * Usa o mesmo getPrecoPorMaterial dos Painéis (CRUD → pricing.json → fallback).
 */
export function deriveCustoChapaReal(input: {
  cutlist: CutListItemComPreco[];
  sheetLarguraMm?: number;
  sheetAlturaMm?: number;
}): DeriveCustoChapaRealResult {
  const warnings: string[] = [];
  const sheet = (() => {
    try {
      return getSheetDefinitionFromSettings();
    } catch {
      return {
        largura_mm: CHAPA_PADRAO_LARGURA,
        altura_mm: CHAPA_PADRAO_ALTURA,
        espessura_mm: 19,
      };
    }
  })();

  const L = input.sheetLarguraMm ?? sheet.largura_mm ?? CHAPA_PADRAO_LARGURA;
  const A = input.sheetAlturaMm ?? sheet.altura_mm ?? CHAPA_PADRAO_ALTURA;
  const sheetAreaM2 = (Math.max(0, L) / 1000) * (Math.max(0, A) / 1000);

  const { materialKey, espessuraMm } = resolveDominantMaterialFromCutlist(input.cutlist ?? []);
  if (!materialKey) {
    warnings.push("deriveCustoChapaReal: sem material no cutlist → custoChapaReal=0");
    return {
      custoChapaReal: 0,
      eurM2: 0,
      sheetAreaM2,
      materialKey: "",
      espessuraMm,
      warnings,
    };
  }
  if (!(sheetAreaM2 > 0)) {
    warnings.push("deriveCustoChapaReal: área de chapa inválida → custoChapaReal=0");
    return {
      custoChapaReal: 0,
      eurM2: 0,
      sheetAreaM2: 0,
      materialKey,
      espessuraMm,
      warnings,
    };
  }

  const eurM2 = getPrecoPorMaterial(materialKey, espessuraMm);
  if (!(eurM2 > 0)) {
    warnings.push(
      `deriveCustoChapaReal: €/m²=0 para "${materialKey}" → custoChapaReal=0`
    );
    return {
      custoChapaReal: 0,
      eurM2: 0,
      sheetAreaM2,
      materialKey,
      espessuraMm,
      warnings,
    };
  }

  const custoChapaReal = Math.round(eurM2 * sheetAreaM2 * 100) / 100;
  return { custoChapaReal, eurM2, sheetAreaM2, materialKey, espessuraMm, warnings };
}
