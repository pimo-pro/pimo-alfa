/**
 * Regras industriais de ORLA por tipo de peca (SSOT metros / PDF).
 * Costa nunca recebe orla. gav_frent_int / laterais / costa de gaveta: so aresta superior.
 * Literais PT usam escapes Unicode quando necessario.
 */

import type { OrlaSideId } from "./orlaTypes";
import { EMPTY_ORLA_SIDES, type PieceOrlaConfig } from "./orlaTypes";

/** Normaliza tipo cutlist para matching. */
export function normalizeOrlaPieceTipo(tipoRaw: string): string {
  return String(tipoRaw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function isCostaPieceTipo(tipoRaw: string): boolean {
  const t = normalizeOrlaPieceTipo(tipoRaw);
  if (!t.includes("costa")) return false;
  // costa de gaveta (gav_costa) nao e a costa do modulo
  if (t.includes("gav") || t.includes("gaveta")) return false;
  return true;
}

/**
 * Lados de orla a activar (dominio front/back/left/right).
 * Para pecas de gaveta "so topo", usa-se `front` como aresta superior (ver orlaEdgeLengths).
 */
export function resolveOrlaSidesForPieceTipo(tipoRaw: string): OrlaSideId[] {
  const t = normalizeOrlaPieceTipo(tipoRaw);
  if (!t) return [];

  // C) Costa do modulo — nunca
  if (isCostaPieceTipo(t)) return [];

  // Fundo de gaveta — sem orla
  if (t.includes("gav") && (t.includes("fundo") || t.includes("bottom") || t.includes("base"))) {
    return [];
  }

  // B) Gavetas — so aresta superior (mapeada a `front` no calculo de metros)
  if (
    /gav_lat|gaveta_lat|gav_lat_dir|gav_lat_esq/.test(t) ||
    (t.includes("gaveta") && (t.includes("lateral") || t.includes("lat_")))
  ) {
    return ["front"];
  }
  if (/gav_costa|gaveta_costa/.test(t) || (t.includes("gaveta") && t.includes("costa"))) {
    return ["front"];
  }
  if (/gav_frent_int|gaveta_frent_int|frente_int/.test(t)) {
    return ["front"];
  }

  // Laterais da caixa / sep / div — frente e tras
  if (t.includes("lateral") || t.includes("separador") || t.startsWith("div") || t.includes("divisor")) {
    return ["front", "back"];
  }

  // A) Todas as bordas
  if (
    t.includes("porta") ||
    t.includes("frente_fixa") ||
    t.includes("prateleira") ||
    t.includes("shelf") ||
    t === "cima" ||
    t === "fundo" ||
    t.includes("tampo") ||
    t.includes("remate") ||
    t.includes("rodape") ||
    /gaveta_frente|gav_frente|frente_gaveta/.test(t) ||
    (t.includes("gaveta") && t.includes("frente") && !t.includes("int"))
  ) {
    return ["front", "back", "left", "right"];
  }

  // Default pecas de caixa: todas as bordas (excepto costa ja filtrada)
  return ["front", "back", "left", "right"];
}

export function buildPieceOrlaConfigForTipo(
  tipoRaw: string,
  presetId: string,
  previous?: PieceOrlaConfig
): PieceOrlaConfig | null {
  const sidesToEnable = resolveOrlaSidesForPieceTipo(tipoRaw);
  if (sidesToEnable.length === 0) return null;
  const sides = EMPTY_ORLA_SIDES();
  for (const side of sidesToEnable) {
    sides[side] = { presetId, enabled: true };
  }
  return {
    sides,
    orlaJunto: previous?.orlaJunto,
  };
}

/** Remove espessura do nome de material (ex. "MDF Branco 19mm" -> "MDF Branco"). */
export function stripMaterialThicknessLabel(label: string): string {
  const multiply = "[\u00d7xX]";
  return String(label ?? "")
    .replace(new RegExp(`\\s*\\d+([.,]\\d+)?\\s*${multiply}\\s*\\d+([.,]\\d+)?\\s*mm\\b`, "gi"), "")
    .replace(/\s*\d+([.,]\d+)?\s*mm\b/gi, "")
    .replace(new RegExp(`\\s*${multiply}\\s*$`, "g"), "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ref de orla para PDF: nome + espessura + largura. */
export function formatOrlaRefForPdf(nome: string, espessuraMm: number, larguraMm: number): string {
  const n = String(nome ?? "").trim() || "Orla";
  const e = Number.isFinite(espessuraMm) ? espessuraMm : 0.8;
  const l = Number.isFinite(larguraMm) ? larguraMm : 23;
  return `${n} ${e}mm ${l}mm`.replace(/\s+/g, " ").trim();
}
