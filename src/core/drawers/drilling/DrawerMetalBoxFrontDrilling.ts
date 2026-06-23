/**
 * Furação da frente para fixação caixa metálica ↔ frente (independente da estrutural em madeira).
 */

import type { TechnicalDrillHole } from "../../types";
import {
  isMetalBoxCatalogType,
  resolveMetalBoxFrontHoleYOnPanel,
  resolveMetalBoxHeightMm,
  resolveMetalBoxProfile,
} from "../drawerMetalBoxCatalog";

export type DrawerMetalBoxFrontDrillingInput = {
  tipo: string;
  largura: number;
  altura: number;
  espessura: number;
  metalBoxType?: string;
  metalBoxProfileId?: string;
  metalBoxHeightMm?: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Furos de fixação da frente quando caixa metálica está activa.
 * Substitui furação estrutural de madeira (4 furos horizontais) neste caso.
 */
export function computeDrawerMetalBoxFrontHoles(
  piece: DrawerMetalBoxFrontDrillingInput
): TechnicalDrillHole[] {
  if (piece.tipo !== "gaveta_frente_int" && piece.tipo !== "gaveta_frente" && piece.tipo !== "gaveta") return [];
  if (!isMetalBoxCatalogType(piece.metalBoxType)) return [];

  const profile = resolveMetalBoxProfile(
    piece.metalBoxType,
    piece.metalBoxProfileId,
    piece.metalBoxHeightMm
  );
  if (!profile) return [];

  const metalHeight = resolveMetalBoxHeightMm(profile, piece.metalBoxHeightMm);
  const anchorY = resolveMetalBoxFrontHoleYOnPanel(piece.altura, metalHeight);
  const holes: TechnicalDrillHole[] = [];

  for (const template of profile.frontHoles) {
    const x =
      template.xFromLeft < 0
        ? piece.largura + template.xFromLeft
        : template.xFromLeft;
    const y = template.yFromTop > 0 ? template.yFromTop : anchorY;
    const radius = Math.max(0.25, template.diametro / 2);
    holes.push({
      x: clamp(x, radius, Math.max(radius, piece.largura - radius)),
      y: clamp(y, radius, Math.max(radius, piece.altura - radius)),
      diametro: template.diametro,
      profundidade: Math.min(template.profundidade, piece.espessura),
      tipo: "fixacao_metalica",
      face: "tras",
    });
  }

  return holes;
}
