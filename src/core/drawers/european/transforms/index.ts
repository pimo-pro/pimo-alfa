/**
 * european/transforms ×Transforms 3D do Modelo B.
 * Constrói origem do grupo + offsets locais das peças a partir de geometry europeia
 * ou de um DrawerLayerItem jágerado (metadata.modeloB).
 */

import type { DrawerLayerItem } from "../../../../models/BoxLayers";
import type { DrawerGeometry } from "../types";
import {
  buildEuropeanLocalPieceMapMm,
  calculateEuropeanPieceLocalMm,
  type EuropeanLocalPieceMapMm,
  type Vec3Mm,
} from "../placement";

export type EuropeanDrawerTransformsMm = EuropeanLocalPieceMapMm & {
  /** Dimensões úteis para validação rápida. */
  bodyDepthMm: number;
  usefulHeightMm: number;
};

function layerPieceOrigin(
  x?: number,
  y?: number,
  z?: number
): Vec3Mm {
  return {
    xMm: Number.isFinite(x) ? (x as number) : 0,
    yMm: Number.isFinite(y) ? (y as number) : 0,
    zMm: Number.isFinite(z) ? (z as number) : 0,
  };
}

/**
 * Constrói transforms a partir da geometry europeia (preferido).
 */
export function buildEuropeanTransformsFromGeometry(
  geometry: DrawerGeometry
): EuropeanDrawerTransformsMm {
  const map = buildEuropeanLocalPieceMapMm(geometry);
  return {
    ...map,
    bodyDepthMm: geometry.bodyDepthMm,
    usefulHeightMm: geometry.usefulHeightMm,
  };
}

/**
 * Constrói transforms a partir de um layer Modelo B (origens absolutas no layer).
 * Converte para locais relativos —frente ão que o DrawerFactory espera.
 */
export function buildEuropeanTransformsFromLayer(
  item: DrawerLayerItem
): EuropeanDrawerTransformsMm {
  const group = layerPieceOrigin(item.posX, item.posY, item.posZ);
  // Se frontPos coincide com pos (absoluto), usa front como origem do grupo.
  const frontAbs = layerPieceOrigin(item.frontPosX, item.frontPosY, item.frontPosZ);
  const origin =
    Number.isFinite(item.frontPosX) || Number.isFinite(item.frontPosY) || Number.isFinite(item.frontPosZ)
      ? frontAbs
      : group;

  const localOf = (x?: number, y?: number, z?: number) =>
    calculateEuropeanPieceLocalMm(layerPieceOrigin(x, y, z), origin);

  return {
    group: origin,
    front: { xMm: 0, yMm: 0, zMm: 0 },
    frontInt:
      item.frontIntWidth && item.frontIntThickness
        ? localOf(
            0,
            item.frontPosY,
            (item.posZ ?? 0) - (item.frontThickness ?? 0) / 2 - (item.frontIntThickness ?? 0) / 2
          )
        : undefined,
    leftSide: localOf(item.leftSidePosX, item.leftSidePosY, item.leftSidePosZ),
    rightSide: localOf(item.rightSidePosX, item.rightSidePosY, item.rightSidePosZ),
    bottom: localOf(item.bottomPosX, item.bottomPosY, item.bottomPosZ),
    back: localOf(item.backPosX, item.backPosY, item.backPosZ),
    bodyDepthMm: item.bodyDepth ?? item.depth ?? 0,
    usefulHeightMm: item.bodyHeight ?? item.height ?? 0,
  };
}

export const drawerEuropeanTransforms = {
  build: buildEuropeanTransformsFromGeometry,
  buildFromLayer: buildEuropeanTransformsFromLayer,
};

export default drawerEuropeanTransforms;
