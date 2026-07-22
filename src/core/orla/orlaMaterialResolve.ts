/**
 * Resolve materia de orla por peca (chapa da peca ? materia da caixa).
 * Faz match do preset Admin ao acabamento da peca quando possivel.
 */

import type { CutListItem } from "../types";
import type { OrlaPreset } from "./orlaTypes";
import { findOrlaPreset } from "./orlaPresets";
import { stripMaterialThicknessLabel } from "./orlaIndustrialRules";
import { getMaterialDisplayInfo, getMaterialByIdOrLabel } from "../materials/service";

const FAMILY_TOKENS = [
  "carvalho",
  "nogueira",
  "branco",
  "preto",
  "cinza",
  "cinzento",
  "lacado",
  "freixo",
  "wenge",
  "oak",
  "walnut",
  "white",
  "black",
] as const;

function normalizeText(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Familia de acabamento (ex. "branco", "carvalho") a partir do label da chapa. */
export function extractOrlaMaterialFamily(label: string): string | null {
  const n = normalizeText(stripMaterialThicknessLabel(label));
  if (!n) return null;
  for (const tok of FAMILY_TOKENS) {
    if (n.includes(tok)) return tok;
  }
  // primeiro token util (ex. "mdf" sozinho nao conta como familia de cor)
  const parts = n.split(/\s+/).filter((p) => p.length >= 4 && !["mdf", "hdf", "placa"].includes(p));
  return parts[0] ?? null;
}

export type PieceOrlaMaterialRef = {
  orlaMaterialId: string;
  orlaMaterialLabel: string;
};

/** Material da peca (chapa) — nunca forcar o da caixa. */
export function resolvePieceOrlaMaterial(item: CutListItem): PieceOrlaMaterialRef {
  const idRaw = String(item.materialId ?? "").trim();
  const labelRaw = String(item.material ?? "").trim();

  if (idRaw) {
    const rec = getMaterialByIdOrLabel(idRaw);
    if (rec) {
      const info = getMaterialDisplayInfo(rec.id);
      return {
        orlaMaterialId: rec.id,
        orlaMaterialLabel: stripMaterialThicknessLabel(info.label || rec.label || labelRaw) || rec.id,
      };
    }
    const info = getMaterialDisplayInfo(idRaw);
    return {
      orlaMaterialId: idRaw,
      orlaMaterialLabel: stripMaterialThicknessLabel(info.label || labelRaw || idRaw) || idRaw,
    };
  }

  if (labelRaw) {
    const rec = getMaterialByIdOrLabel(labelRaw);
    if (rec) {
      const info = getMaterialDisplayInfo(rec.id);
      return {
        orlaMaterialId: rec.id,
        orlaMaterialLabel: stripMaterialThicknessLabel(info.label || rec.label || labelRaw) || labelRaw,
      };
    }
    return {
      orlaMaterialId: labelRaw,
      orlaMaterialLabel: stripMaterialThicknessLabel(labelRaw) || labelRaw,
    };
  }

  return { orlaMaterialId: "orla", orlaMaterialLabel: "Orla" };
}

/**
 * Escolhe preset de orla pelo acabamento da peca (+ largura adequada a espessura).
 * Fallback = preset da caixa.
 */
export function resolveOrlaPresetIdForPiece(
  pieceMaterialLabel: string,
  espessuraMm: number,
  presets: OrlaPreset[],
  boxPresetId: string | null
): string | null {
  if (!presets.length) return boxPresetId;
  const family = extractOrlaMaterialFamily(pieceMaterialLabel);
  let best: { id: string; score: number } | null = null;

  for (const p of presets) {
    let score = 0;
    const nome = normalizeText(p.nome);
    if (family && nome.includes(family)) score += 100;
    if (Number.isFinite(espessuraMm) && espessuraMm > 0) {
      if (p.larguraMm + 1e-6 >= espessuraMm) score += 20;
      // preferir sobra tipica ~3—5 mm
      const target = espessuraMm + 4;
      score -= Math.min(30, Math.abs(p.larguraMm - target));
    }
    if (!best || score > best.score) best = { id: p.id, score };
  }

  if (best && best.score >= 100) return best.id;
  if (boxPresetId && findOrlaPreset(presets, boxPresetId)) return boxPresetId;
  return best?.id ?? boxPresetId;
}
