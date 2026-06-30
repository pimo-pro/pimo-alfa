import type { RulesConfig } from "../rules/rulesConfig";
import type { PanelDrillHole } from "../types";
import { DOBRADICA_TERCEIRO_FURO } from "../drilling/drillingService";

/** Distância do centro do furo à borda frontal da frente fixa (mm) — regra canto direita inferior. */
export const CORNER_FF_HINGE_DEPTH_FROM_FRONT_MM = 31;

export type CornerFixedFrontHingeLayout = {
  fixedFrontWidthMm: number;
  fixedFrontHeightMm: number;
  /** Lado da caixa onde a frente fixa está montada. */
  fixedFrontSide: "left" | "right";
  /** Espessura do material (mm). */
  thicknessMm: number;
  /** Offsets de dobradiça desde a base do vão (mm) — mesma lista que a lateral direita usava. */
  hingePositionsMm: number[];
};

function resolveHingeFixacaoFromRules(rules: RulesConfig) {
  const cfg = rules.furos?.tecnicos?.dobradica_fixacao;
  const distEntre = cfg?.distanciaEntreFurosCalco ?? cfg?.distanciaEntreFuros ?? 32;
  return {
    halfDist: distEntre / 2,
    diametroCalco: cfg?.diametro ?? 5,
    profundidadeCalco: cfg?.profundidadeFuro ?? 12,
  };
}

function hingeFixacaoHole(x: number, y: number, diameter: number, depth: number): PanelDrillHole {
  return {
    x,
    y,
    diameter,
    depth,
    holeType: "dobradica_fixacao",
    topDrillable: true,
    face: "B",
  };
}

function hingeUniaoHole(x: number, y: number): PanelDrillHole {
  return {
    x,
    y,
    diameter: DOBRADICA_TERCEIRO_FURO.diametroMm,
    depth: DOBRADICA_TERCEIRO_FURO.profundidadeMm,
    holeType: "dobradica_parafuso_uniao",
    topDrillable: true,
    face: "B",
  };
}

/**
 * Furos de fixação de dobradiça na frente fixa (Canto Direita Inferior).
 * Substitui furos que antes eram gerados na lateral direita.
 *
 * Convenção cutlist/drillingService: Y=0 no topo, Y↓.
 * Compensação de altura: y_base_ff = offset_vão + espessura (fundo).
 */
export function buildCornerFixedFrontHingeHoles(
  layout: CornerFixedFrontHingeLayout,
  rules: RulesConfig
): PanelDrillHole[] {
  const ffW = Math.max(1, layout.fixedFrontWidthMm);
  const ffH = Math.max(1, layout.fixedFrontHeightMm);
  const t = Math.max(1, layout.thicknessMm);
  const edgeOffset = t / 2;
  const depthFront = CORNER_FF_HINGE_DEPTH_FROM_FRONT_MM;
  const { halfDist, diametroCalco, profundidadeCalco } = resolveHingeFixacaoFromRules(rules);

  const xCalco =
    layout.fixedFrontSide === "left" ? ffW - edgeOffset : edgeOffset;
  const xUniao =
    layout.fixedFrontSide === "left" ? depthFront : ffW - depthFront;

  const out: PanelDrillHole[] = [];
  for (const oy of layout.hingePositionsMm) {
    if (!Number.isFinite(oy)) continue;
    const yFromBottom = oy + t;
    const yCenter = ffH - yFromBottom;
    out.push(
      hingeFixacaoHole(xCalco, yCenter - halfDist, diametroCalco, profundidadeCalco),
      hingeFixacaoHole(xCalco, yCenter + halfDist, diametroCalco, profundidadeCalco),
      hingeUniaoHole(xUniao, yCenter)
    );
  }
  return out;
}

/** Remove furos de dobradiça (transferidos para frente fixa no canto direita inferior). */
export function stripCornerLateralHingeHoles(holes: PanelDrillHole[]): PanelDrillHole[] {
  const HINGE = new Set(["dobradica", "dobradica_fixacao", "dobradica_parafuso_uniao"]);
  return holes.filter((h) => !HINGE.has(h.holeType ?? ""));
}
