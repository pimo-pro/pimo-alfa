/**
 * P3.9 F4 — SSOT operações industriais avançadas (tarifas tipadas).
 * Lê cutlist drillHoles / metadata; não altera CNC/TCN/cutlist/drill/PDFs.
 */

import type { CutListItemComPreco, PanelDrillHole } from "../types";
import { getSettings } from "../settings/settingsService";
import type { OrcamentosOperacoesAvancadasSettings } from "../orcamentos";
import {
  defaultOperacoesAvancadasSettings,
  normalizeOperacoesAvancadasSettings,
} from "../orcamentos/orcamentosSettings";

/** Mapeamentos documentais (IDs internos ? heurística cutlist). */
export const OPS_ADV_MAP = {
  foro5mm: "furo_5mm",
  cavilha10x13: "cavilha_10x13_frente",
  cavilha10x30: "cavilha_10x30_lateral",
  calco: "calco",
  dobradica: "dobradica_porta",
  rasgoGaveta: "rasgo_gaveta",
  corteManual: "manualCut",
  meQuadrilha: "quadrilha",
} as const;

export type OperacoesAvancadasBreakdown = {
  foros5: number;
  cavilha10x13: number;
  cavilha10x30: number;
  calcoGrupos: number;
  dobradicaGrupos: number;
  rasgos: number;
  cortesM: number;
  quadrilha: number;
};

export type OperacoesAvancadasFinanceirasResult = {
  precoForos: number;
  precoGrupos: number;
  precoRasgo: number;
  precoCorteManual: number;
  precoQuadrilha: number;
  precoTotal: number;
  breakdown: OperacoesAvancadasBreakdown;
  /** Totais agregados para Unificado. */
  foros: number;
  grupos: number;
  rasgos: number;
  cortes: number;
  quadrilha: number;
  eurByPieceId: Map<string, number>;
  forosByPieceId: Map<string, number>;
  gruposByPieceId: Map<string, number>;
  rasgoByPieceId: Map<string, number>;
  corteByPieceId: Map<string, number>;
  quadrilhaByPieceId: Map<string, number>;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function approx(n: number, target: number, tol = 0.6): boolean {
  return Math.abs(n - target) <= tol;
}

function resolveTarifas(
  override?: Partial<OrcamentosOperacoesAvancadasSettings> | null
): OrcamentosOperacoesAvancadasSettings {
  const fromSettings = (() => {
    try {
      return getSettings().orcamentos?.operacoesAvancadas;
    } catch {
      return undefined;
    }
  })();
  return normalizeOperacoesAvancadasSettings({
    ...defaultOperacoesAvancadasSettings(),
    ...fromSettings,
    ...override,
  });
}

function isGroove(h: PanelDrillHole): boolean {
  return h.holeSubtype === "groove";
}

function isCalcoHole(h: PanelDrillHole): boolean {
  return h.holeType === "dobradica_fixacao";
}

function isDobradicaCaneco(h: PanelDrillHole): boolean {
  return h.holeType === "dobradica";
}

function isCavilha(h: PanelDrillHole): boolean {
  return h.holeType === "cavilha";
}

function classifyCavilha(
  h: PanelDrillHole
): "cavilha10x13" | "cavilha10x30" | null {
  if (!isCavilha(h)) return null;
  const d = Number(h.diameter) || 0;
  const depth = Number(h.depth) || 0;
  if (!(approx(d, 10, 1.5) || d === 0)) {
    // cavilha tipada sem diâmetro explícito — classifica só por depth
    if (approx(depth, 13, 3)) return "cavilha10x13";
    if (approx(depth, 30, 4)) return "cavilha10x30";
    return null;
  }
  if (approx(depth, 13, 3) || (depth > 0 && depth < 20)) return "cavilha10x13";
  if (approx(depth, 30, 4) || depth >= 20) return "cavilha10x30";
  return null;
}

function isForo5mm(h: PanelDrillHole): boolean {
  if (isGroove(h) || isCalcoHole(h) || isDobradicaCaneco(h) || isCavilha(h)) return false;
  if (h.holeType === "dobradica_parafuso_uniao") return false;
  const d = Number(h.diameter) || 0;
  return approx(d, 5, 0.6);
}

function pieceHasManualCut(item: CutListItemComPreco): boolean {
  const meta = item.metadata as Record<string, unknown> | undefined;
  return meta?.manualCut === true;
}

function pieceIsQuadrilha(item: CutListItemComPreco): boolean {
  const t = String(item.tipo ?? "").toLowerCase();
  const n = String(item.nome ?? "").toLowerCase();
  return t.includes("quadrilha") || n.includes("quadrilha");
}

function pricePiece(
  item: CutListItemComPreco,
  tarifas: OrcamentosOperacoesAvancadasSettings
): {
  foros: number;
  grupos: number;
  rasgo: number;
  corte: number;
  quadrilha: number;
  total: number;
  counts: OperacoesAvancadasBreakdown;
} {
  const qty = Math.max(1, item.quantidade ?? 1);
  const holes = item.drillHoles ?? [];
  let n5 = 0;
  let n13 = 0;
  let n30 = 0;
  let nCalco = 0;
  let nDob = 0;
  let nRasgo = 0;

  for (const h of holes) {
    if (isGroove(h)) {
      nRasgo += 1;
      continue;
    }
    if (isCalcoHole(h)) {
      nCalco += 1;
      continue;
    }
    if (isDobradicaCaneco(h)) {
      nDob += 1;
      continue;
    }
    const cav = classifyCavilha(h);
    if (cav === "cavilha10x13") {
      n13 += 1;
      continue;
    }
    if (cav === "cavilha10x30") {
      n30 += 1;
      continue;
    }
    if (isForo5mm(h)) n5 += 1;
  }

  const calcoGrupos = Math.floor(nCalco / 3);
  const dobGrupos = nDob;

  const foros = round2(
    (n5 * tarifas.precoForo5mm +
      n13 * tarifas.precoForoCavilha10x13 +
      n30 * tarifas.precoForoCavilha10x30) *
      qty
  );
  const grupos = round2(
    (calcoGrupos * tarifas.precoForoCalcoGrupo +
      dobGrupos * tarifas.precoForoDobradicaGrupo) *
      qty
  );
  const rasgo = round2(nRasgo * tarifas.precoRasgoGaveta * qty);

  let corte = 0;
  let cortesM = 0;
  if (pieceHasManualCut(item) && tarifas.precoCorteManualPorMetro > 0) {
    const L = item.dimensoes?.largura ?? 0;
    const A = item.dimensoes?.altura ?? 0;
    const metros = Math.max(L, A) / 1000;
    if (metros > 0) {
      cortesM = round2(metros * qty);
      corte = round2(metros * tarifas.precoCorteManualPorMetro * qty);
    }
  }

  let quadrilha = 0;
  let nQuad = 0;
  if (pieceIsQuadrilha(item) && tarifas.precoMeQuadrilha > 0) {
    nQuad = qty;
    quadrilha = round2(tarifas.precoMeQuadrilha * qty);
  }

  return {
    foros,
    grupos,
    rasgo,
    corte,
    quadrilha,
    total: round2(foros + grupos + rasgo + corte + quadrilha),
    counts: {
      foros5: n5 * qty,
      cavilha10x13: n13 * qty,
      cavilha10x30: n30 * qty,
      calcoGrupos: calcoGrupos * qty,
      dobradicaGrupos: dobGrupos * qty,
      rasgos: nRasgo * qty,
      cortesM,
      quadrilha: nQuad,
    },
  };
}

/**
 * Calcula custos tipados F4 a partir da cutlist e tarifas Orçamentos.
 */
export function computeOperacoesIndustriaisAvancadas(
  cutlist: CutListItemComPreco[],
  tarifasOverride?: Partial<OrcamentosOperacoesAvancadasSettings> | null
): OperacoesAvancadasFinanceirasResult {
  const tarifas = resolveTarifas(tarifasOverride);
  const eurByPieceId = new Map<string, number>();
  const forosByPieceId = new Map<string, number>();
  const gruposByPieceId = new Map<string, number>();
  const rasgoByPieceId = new Map<string, number>();
  const corteByPieceId = new Map<string, number>();
  const quadrilhaByPieceId = new Map<string, number>();

  const breakdown: OperacoesAvancadasBreakdown = {
    foros5: 0,
    cavilha10x13: 0,
    cavilha10x30: 0,
    calcoGrupos: 0,
    dobradicaGrupos: 0,
    rasgos: 0,
    cortesM: 0,
    quadrilha: 0,
  };

  let precoForos = 0;
  let precoGrupos = 0;
  let precoRasgo = 0;
  let precoCorteManual = 0;
  let precoQuadrilha = 0;

  for (const item of cutlist ?? []) {
    const id = String(item.id ?? "");
    const r = pricePiece(item, tarifas);
    precoForos = round2(precoForos + r.foros);
    precoGrupos = round2(precoGrupos + r.grupos);
    precoRasgo = round2(precoRasgo + r.rasgo);
    precoCorteManual = round2(precoCorteManual + r.corte);
    precoQuadrilha = round2(precoQuadrilha + r.quadrilha);

    breakdown.foros5 += r.counts.foros5;
    breakdown.cavilha10x13 += r.counts.cavilha10x13;
    breakdown.cavilha10x30 += r.counts.cavilha10x30;
    breakdown.calcoGrupos += r.counts.calcoGrupos;
    breakdown.dobradicaGrupos += r.counts.dobradicaGrupos;
    breakdown.rasgos += r.counts.rasgos;
    breakdown.cortesM = round2(breakdown.cortesM + r.counts.cortesM);
    breakdown.quadrilha += r.counts.quadrilha;

    if (!id) continue;
    if (r.foros > 0) forosByPieceId.set(id, r.foros);
    if (r.grupos > 0) gruposByPieceId.set(id, r.grupos);
    if (r.rasgo > 0) rasgoByPieceId.set(id, r.rasgo);
    if (r.corte > 0) corteByPieceId.set(id, r.corte);
    if (r.quadrilha > 0) quadrilhaByPieceId.set(id, r.quadrilha);
    if (r.total > 0) eurByPieceId.set(id, r.total);
  }

  const precoTotal = round2(
    precoForos + precoGrupos + precoRasgo + precoCorteManual + precoQuadrilha
  );

  return {
    precoForos,
    precoGrupos,
    precoRasgo,
    precoCorteManual,
    precoQuadrilha,
    precoTotal,
    breakdown,
    foros: precoForos,
    grupos: precoGrupos,
    rasgos: precoRasgo,
    cortes: precoCorteManual,
    quadrilha: precoQuadrilha,
    eurByPieceId,
    forosByPieceId,
    gruposByPieceId,
    rasgoByPieceId,
    corteByPieceId,
    quadrilhaByPieceId,
  };
}
