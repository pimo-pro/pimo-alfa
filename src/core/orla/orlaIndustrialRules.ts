/**
 * Regras industriais de ORLA por tipo de peca (SSOT metros / PDF).
 * Costa nunca recebe orla. Prateleiras nunca recebem orla.
 * Painéis < 16 mm nao recebem orla.
 * Gavetas (laterais / costa / frente int): so aresta superior.
 * Portas duplas: perímetro sem aresta de encontro.
 */

import type { OrlaSideId } from "./orlaTypes";
import { EMPTY_ORLA_SIDES, type PieceOrlaConfig } from "./orlaTypes";

/** Espessura minima de chapa (mm) para aplicar orla — excepto costa (sempre sem orla). */
export const MIN_ORLA_PANEL_THICKNESS_MM = 16;

export type OrlaPieceSideContext = {
  /** Nome da peça (ex. PORT_ESQ). */
  nome?: string;
  /** Lado da dobradiça (porta). */
  hingeSide?: string;
  /** Índice da folha em porta dupla (0 = esq, 1 = dir). */
  doorsLayerIndex?: number;
};

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
  // costa de gaveta (gav_costa / gaveta_traseira) nao e a costa do modulo
  if (t.includes("gav") || t.includes("gaveta") || t.includes("traseira")) return false;
  return true;
}

export function isPrateleiraPieceTipo(tipoRaw: string): boolean {
  const t = normalizeOrlaPieceTipo(tipoRaw);
  return t.includes("prateleira") || t.includes("shelf");
}

/** True se a espessura da chapa permite orla industrial. */
export function pieceAllowsOrlaByThickness(espessuraMm: number): boolean {
  return Number.isFinite(espessuraMm) && espessuraMm + 1e-6 >= MIN_ORLA_PANEL_THICKNESS_MM;
}

function isDrawerTopOnlyTipo(t: string): boolean {
  if (/gav_lat|gaveta_lat|gav_lat_dir|gav_lat_esq/.test(t)) return true;
  if (t.includes("gaveta") && (t.includes("lateral") || t.includes("lat_"))) return true;
  // costa / traseira de gaveta
  if (/gav_costa|gaveta_costa|gaveta_traseira/.test(t)) return true;
  if (t.includes("gaveta") && (t.includes("costa") || t.includes("traseira"))) return true;
  // frente interior de gaveta
  if (/gav_frent_int|gaveta_frent_int|gaveta_frente_int|frente_int/.test(t)) return true;
  if (t.includes("gaveta") && t.includes("frente") && t.includes("int")) return true;
  return false;
}

function isDrawerBottomTipo(t: string): boolean {
  return t.includes("gav") && (t.includes("fundo") || t.includes("bottom") || t.includes("base"));
}

function isBoxSideOrDividerTipo(t: string): boolean {
  if (t.includes("lateral") && !t.includes("gav")) return true;
  if (t.includes("separador") || t === "sep") return true;
  if (t.startsWith("div") || t.includes("divisor")) return true;
  return false;
}

/**
 * Folha de porta dupla: esq / dir / null (simples ou indeterminado).
 * Aresta de encontro (sem orla): esq → right; dir → left.
 */
export function resolveDoubleDoorLeaf(
  tipoRaw: string,
  ctx?: OrlaPieceSideContext
): "esq" | "dir" | null {
  const t = normalizeOrlaPieceTipo(tipoRaw);
  const nome = normalizeOrlaPieceTipo(ctx?.nome ?? "");
  const blob = `${t} ${nome}`;

  if (/porta_esq|port_esq|_esq\b|esquerda/.test(blob) && /porta|port_/.test(blob)) return "esq";
  if (/porta_dir|port_dir|_dir\b|direita/.test(blob) && /porta|port_/.test(blob)) return "dir";

  const hinge = String(ctx?.hingeSide ?? "").toLowerCase();
  if (t.includes("porta") && (t.includes("dupla") || ctx?.doorsLayerIndex != null || hinge)) {
    if (hinge === "left" || hinge === "esq") return "esq";
    if (hinge === "right" || hinge === "dir") return "dir";
    if (ctx?.doorsLayerIndex === 0) return "esq";
    if (ctx?.doorsLayerIndex === 1) return "dir";
  }
  return null;
}

function isAllEdgesTipo(t: string): boolean {
  if (t.includes("porta")) return true;
  if (t.includes("frente_fixa")) return true;
  // prateleiras: sem orla (tratado noutro ramo)
  if (t === "cima" || t === "fundo" || t.includes("tampo")) return true;
  if (t.includes("remate") || t.includes("rodape") || t.includes("roda_pe") || t.includes("roda-pe")) {
    return true;
  }
  // frente de gaveta (exterior) — todas as bordas; frente_int ja filtrada acima
  if (/gaveta_frente|gav_frente|frente_gaveta/.test(t)) return true;
  if (t.includes("gaveta") && t.includes("frente") && !t.includes("int")) return true;
  return false;
}

/**
 * Lados de orla a activar (dominio front/back/left/right).
 * Para pecas de gaveta "so topo", usa-se `front` como aresta superior (ver orlaEdgeLengths).
 */
export function resolveOrlaSidesForPieceTipo(
  tipoRaw: string,
  ctx?: OrlaPieceSideContext
): OrlaSideId[] {
  const t = normalizeOrlaPieceTipo(tipoRaw);
  if (!t) return [];

  // Costa do modulo — nunca
  if (isCostaPieceTipo(t)) return [];

  // Prateleiras — nunca
  if (isPrateleiraPieceTipo(t)) return [];

  // Fundo de gaveta — sem orla
  if (isDrawerBottomTipo(t)) return [];

  // Gavetas: so aresta superior (mapeada a `front` no calculo de metros)
  if (isDrawerTopOnlyTipo(t)) return ["front"];

  // Laterais da caixa / sep / div — frente e tras
  if (isBoxSideOrDividerTipo(t)) return ["front", "back"];

  // Portas: simples = 4 lados; duplas = sem aresta de encontro
  if (t.includes("porta")) {
    const leaf = resolveDoubleDoorLeaf(t, ctx);
    if (leaf === "esq") return ["front", "back", "left"];
    if (leaf === "dir") return ["front", "back", "right"];
    return ["front", "back", "left", "right"];
  }

  // Todas as bordas (cima, fundo, remates, frente gaveta, —)
  if (isAllEdgesTipo(t)) return ["front", "back", "left", "right"];

  // Default pecas de caixa: todas as bordas (excepto costa/prateleira ja filtradas)
  return ["front", "back", "left", "right"];
}

export function buildPieceOrlaConfigForTipo(
  tipoRaw: string,
  presetId: string,
  previous?: PieceOrlaConfig,
  espessuraMm?: number,
  ctx?: OrlaPieceSideContext
): PieceOrlaConfig | null {
  if (isCostaPieceTipo(tipoRaw)) return null;
  if (isPrateleiraPieceTipo(tipoRaw)) return null;
  if (espessuraMm != null && !pieceAllowsOrlaByThickness(espessuraMm)) return null;

  const sidesToEnable = resolveOrlaSidesForPieceTipo(tipoRaw, ctx);
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

/** Remove espessura do nome de material (ex. "MDF Branco 19mm" / "MDF Branco 19" -> "MDF Branco"). */
export function stripMaterialThicknessLabel(label: string): string {
  const multiply = "[\u00d7xX]";
  return String(label ?? "")
    .replace(new RegExp(`\\s*\\d+([.,]\\d+)?\\s*${multiply}\\s*\\d+([.,]\\d+)?\\s*mm\\b`, "gi"), "")
    .replace(/\s*\d+([.,]\d+)?\s*mm\b/gi, "")
    .replace(/\s+\d+([.,]\d+)?\s*$/g, "")
    .replace(new RegExp(`\\s*${multiply}\\s*$`, "g"), "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ref de orla para PDF: nome + espessura (sem largura). */
export function formatOrlaRefForPdf(nome: string, espessuraMm: number, _larguraMm?: number): string {
  const n = String(nome ?? "").trim() || "Orla";
  // Se o nome ja inclui a espessura (ex. "PVC 0.8—23 mm"), extrair base + espessura do preset
  const cleaned = n
    .replace(/\s*\d+([.,]\d+)?\s*[\u00d7xX]\s*\d+([.,]\d+)?\s*mm\b/gi, "")
    .replace(/\s*\d+([.,]\d+)?\s*mm\b/gi, "")
    .replace(/\s*\d+([.,]\d+)?\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const e = Number.isFinite(espessuraMm) ? espessuraMm : 0.8;
  return `${cleaned || "Orla"} ${e}mm`.replace(/\s+/g, " ").trim();
}
