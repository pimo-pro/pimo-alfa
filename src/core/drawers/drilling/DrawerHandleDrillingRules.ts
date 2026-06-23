/**
 * Furação industrial de puxadores em frentes de gaveta.
 * Independente da furação estrutural (DrawerDrillingRules) e de corrediças.
 */

import type { TechnicalDrillHole } from "../../types";
import type { DrawerHandlePosition } from "../../settings/settingsSchema";
import {
  resolveDrawerHandleProfile,
  type DrawerHandleProfile,
} from "../drawerHandleCatalog";
import { resolveHandlePlacementX, resolveHandlePlacementY } from "../handlePlacement";

export type DrawerHandleDrillingInput = {
  tipo: string;
  largura: number;
  altura: number;
  espessura: number;
  handleType?: string;
  handleProfileId?: string;
  handleCenterDistanceMm?: number;
  handlePosition?: DrawerHandlePosition;
  handlePositionPercent?: number;
  handleOffsetXMm?: number;
  handleOffsetYMm?: number;
  handleOffsetMm?: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function pushCircularHole(
  out: TechnicalDrillHole[],
  x: number,
  y: number,
  diametro: number,
  profundidade: number,
  espessura: number,
  face: TechnicalDrillHole["face"]
) {
  const radius = Math.max(0.25, diametro / 2);
  out.push({
    x: clamp(x, radius, Math.max(radius, 9999)),
    y: clamp(y, radius, Math.max(radius, 9999)),
    diametro: Math.max(0.5, diametro),
    profundidade: Math.min(Math.max(0.5, profundidade), espessura),
    tipo: "puxador",
    face,
  });
}

function pushGrooveHole(
  out: TechnicalDrillHole[],
  y: number,
  grooveWidth: number,
  grooveLength: number,
  profundidade: number,
  espessura: number,
  face: TechnicalDrillHole["face"]
) {
  out.push({
    x: 0,
    y,
    diametro: grooveWidth,
    profundidade: Math.min(Math.max(0.5, profundidade), espessura),
    tipo: "puxador",
    face,
    holeSubtype: "groove",
    grooveWidth,
    grooveLength,
  });
}

/**
 * Calcula furos/rasgos de puxador para uma peça (tipicamente gaveta_frente).
 */
export function computeDrawerHandleHoles(
  piece: DrawerHandleDrillingInput,
  profileOverride?: DrawerHandleProfile | null
): TechnicalDrillHole[] {
  if (piece.tipo !== "gaveta_frente" && piece.tipo !== "gaveta") return [];
  if (!piece.handleType || piece.handleType === "Nenhum") return [];

  const profile =
    profileOverride ??
    resolveDrawerHandleProfile(
      piece.handleType,
      piece.handleProfileId,
      piece.handleCenterDistanceMm
    );
  if (!profile) return [];

  const anchorY = resolveHandlePlacementY({
    larguraMm: piece.largura,
    alturaMm: piece.altura,
    handlePosition: piece.handlePosition,
    handlePositionPercent: piece.handlePositionPercent,
    handleOffsetXMm: piece.handleOffsetXMm,
    handleOffsetYMm: piece.handleOffsetYMm,
    handleOffsetMm: piece.handleOffsetMm,
  });
  const centerX = resolveHandlePlacementX({
    larguraMm: piece.largura,
    alturaMm: piece.altura,
    handleOffsetXMm: piece.handleOffsetXMm,
  });

  const out: TechnicalDrillHole[] = [];

  for (const hole of profile.holes) {
    pushCircularHole(
      out,
      centerX + hole.xFromCenter,
      anchorY + hole.yFromAnchor,
      hole.diametro,
      hole.profundidade,
      piece.espessura,
      hole.face
    );
  }

  if (profile.groove) {
    const grooveLength = Math.min(
      profile.groove.maxLengthMm,
      piece.largura * profile.groove.lengthRatio
    );
    pushGrooveHole(
      out,
      anchorY,
      profile.groove.grooveWidth,
      grooveLength,
      profile.groove.profundidade,
      piece.espessura,
      profile.groove.face
    );
  }

  // Re-clamp X/Y dentro das dimensões reais da peça
  return out.map((h) => {
    if (h.holeSubtype === "groove") {
      return { ...h, y: clamp(h.y, 10, Math.max(10, piece.altura - 10)) };
    }
    const r = Math.max(0.25, h.diametro / 2);
    return {
      ...h,
      x: clamp(h.x, r, Math.max(r, piece.largura - r)),
      y: clamp(h.y, r, Math.max(r, piece.altura - r)),
    };
  });
}
