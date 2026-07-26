/**
 * industrialMetadata.ts — Metadata industrial somente-leitura (Modelo B).
 */

import type {
  EuropeanDrawerBoxInput,
  EuropeanDrawerResult,
  EuropeanDrawerSystemId,
} from "../types";
import {
  EUROPEAN_BACK_THICKNESS_MM,
  EUROPEAN_BOTTOM_THICKNESS_MM,
  EUROPEAN_FRONT_INT_THICKNESS_MM,
  EUROPEAN_SIDE_THICKNESS_MM,
  calcBoxInternalWidthMm,
  resolveEuropeanUsefulInternalDepthMm,
} from "../measures";
import { safeStr } from "./technicalSections";

export type EuropeanIndustrialPieceMeta = {
  nome: string;
  codigo: string;
  material: string;
  espessuraMm: number;
  funcao: string;
  quantidade: number;
  areaM2Approx: number;
};

export type EuropeanIndustrialMetadata = {
  systemId: EuropeanDrawerSystemId;
  modelDisplayName: string;
  brand: string;
  runnerFamily: string;
  runnerLengthMm: number;
  drawerCount: number;
  catalogHeightsMm: number[];
  heightUsedMm: number;
  heightCode?: string;
  materials: {
    front: string;
    body: string;
    bottom: string;
    back: string;
    sides: string;
  };
  thicknessesMm: {
    front: number;
    sides: number;
    back: number;
    bottom: number;
    frontInt?: number;
  };
  industrialCodes: string[];
  flags: {
    dualFront: boolean;
    softClose: boolean;
    pushOpen: boolean;
    frontExternal: boolean;
    frontInternal: boolean;
  };
  /** Consumo aproximado por gaveta (m²) — informativo, não altera cutlist oficial. */
  materialConsumptionM2ApproxPerDrawer: number;
  materialConsumptionM2ApproxTotal: number;
  pieces: EuropeanIndustrialPieceMeta[];
  box?: {
    widthMm: number;
    heightMm: number;
    depthMm: number;
    thicknessMm: number;
    internalWidthMm: number;
    usefulInternalDepthMm: number;
  };
};

function inferFuncao(codigo: string, tipo: string): string {
  const c = codigo.toLowerCase();
  if (c.includes("fren") || tipo.includes("frente")) {
    if (c.includes("int") || tipo.includes("int")) return "frente_interna";
    return "frente_externa";
  }
  if (c.includes("lat_dir") || tipo.includes("lat_dir")) return "lateral_direita";
  if (c.includes("lat_esq") || tipo.includes("lat_esq")) return "lateral_esquerda";
  if (c.includes("costa") || tipo.includes("traseira") || tipo.includes("costa")) return "costa";
  if (c.includes("fun") || tipo.includes("fundo")) return "fundo";
  if (c === "gav" || /^gav_\d+$/.test(c) || tipo.includes("corpo")) return "corpo";
  if (tipo.includes("corred")) return "corredica";
  if (tipo.includes("soft")) return "soft_close";
  if (tipo.includes("push")) return "push_open";
  return tipo || "peca";
}

function pieceAreaM2(larguraMm: number, alturaMm: number, profundidadeMm: number): number {
  const a = Math.max(0, larguraMm);
  const b = Math.max(0, alturaMm);
  const c = Math.max(0, profundidadeMm);
  // Face principal aproximada (maior produto de dois eixos)
  const face = Math.max(a * b, a * c, b * c);
  return face / 1_000_000;
}

/**
 * Extrai metadata industrial do resultado Modelo B (somente leitura).
 */
export function buildEuropeanIndustrialMetadata(
  result: EuropeanDrawerResult,
  box?: EuropeanDrawerBoxInput
): EuropeanIndustrialMetadata {
  const count = Math.max(1, Math.floor(result.config.count ?? 1));
  const wood = result.cutlist.filter((i) => i.kind === "wood");
  const bodyMat =
    result.cutlist.find((i) => i.tipo === "gaveta_corpo" || i.codigo?.startsWith("gav"))?.material ??
    wood.find((i) => i.codigo?.includes("lat"))?.material ??
    "—";
  const frontMat =
    result.config.frontMaterialId ??
    wood.find((i) => (i.codigo ?? "").includes("fren") && !(i.codigo ?? "").includes("int"))?.material ??
    bodyMat;
  const bottomMat = wood.find((i) => (i.codigo ?? "").includes("fun"))?.material ?? bodyMat;
  const backMat = wood.find((i) => (i.codigo ?? "").includes("costa"))?.material ?? bodyMat;
  const sideMat = wood.find((i) => (i.codigo ?? "").includes("lat"))?.material ?? bodyMat;

  const pieces: EuropeanIndustrialPieceMeta[] = result.cutlist
    .filter((i) => i.kind === "wood" || i.tipo === "gaveta_corpo")
    .map((i) => {
      const codigo = safeStr(i.codigo, "");
      const area = pieceAreaM2(i.larguraMm, i.alturaMm, i.profundidadeMm) * Math.max(1, i.quantidade);
      return {
        nome: safeStr(i.nome),
        codigo,
        material: safeStr(i.material),
        espessuraMm: i.espessuraMm,
        funcao: inferFuncao(codigo, i.tipo),
        quantidade: i.quantidade,
        areaM2Approx: area,
      };
    });

  const totalArea = pieces.reduce((acc, p) => acc + p.areaM2Approx, 0);
  const codes = [
    ...new Set(pieces.map((p) => p.codigo).filter((c) => c && c !== "—")),
  ];

  const frontThickness =
    result.geometry.front.thicknessMm || result.model.recommendedFrontThicknessMm;

  const meta: EuropeanIndustrialMetadata = {
    systemId: result.systemId,
    modelDisplayName: result.model.displayName,
    brand: result.model.brand,
    runnerFamily: result.model.side.runnerFamily,
    runnerLengthMm: result.config.depthMm,
    drawerCount: count,
    catalogHeightsMm: result.model.heights.map((h) => h.heightMm),
    heightUsedMm: result.config.heightMm,
    heightCode: result.config.heightCode,
    materials: {
      front: safeStr(frontMat),
      body: safeStr(bodyMat),
      bottom: safeStr(bottomMat),
      back: safeStr(backMat),
      sides: safeStr(sideMat),
    },
    thicknessesMm: {
      front: frontThickness,
      sides: EUROPEAN_SIDE_THICKNESS_MM,
      back: EUROPEAN_BACK_THICKNESS_MM,
      bottom: EUROPEAN_BOTTOM_THICKNESS_MM,
      frontInt: result.config.dualFront ? EUROPEAN_FRONT_INT_THICKNESS_MM : undefined,
    },
    industrialCodes: codes,
    flags: {
      dualFront: result.config.dualFront === true,
      softClose: result.config.softClose === true,
      pushOpen: result.config.pushOpen === true,
      frontExternal: true,
      frontInternal: result.config.dualFront === true,
    },
    materialConsumptionM2ApproxPerDrawer: totalArea / count,
    materialConsumptionM2ApproxTotal: totalArea,
    pieces,
  };

  if (box) {
    meta.box = {
      widthMm: box.dimensoes.largura,
      heightMm: box.dimensoes.altura,
      depthMm: box.dimensoes.profundidade,
      thicknessMm: box.espessura,
      internalWidthMm: calcBoxInternalWidthMm(box),
      usefulInternalDepthMm: resolveEuropeanUsefulInternalDepthMm(box),
    };
  }

  return meta;
}
