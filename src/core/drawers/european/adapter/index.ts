/**
 * adapter/ ù Converte resultado Modelo B ? DrawerLayerItem / CutListItem.
 * Permite reutilizar viewer/cutlist sem alterar o nùcleo do Modelo A.
 */

import type { DrawerLayerItem } from "../../../../models/BoxLayers";
import type { CutListItem, PanelDrillHole } from "../../../types";
import type {
  DrawerCutlistItem,
  DrawerGeometry,
  EuropeanDrawerHole,
  EuropeanDrawerResult,
  EuropeanDrawerSystemId,
} from "../types";
import { europeanHolesToPanelDrillHoles } from "../drilling";
import { EUROPEAN_SIDE_THICKNESS_MM } from "../measures";
import { memo } from "../perf/memo";

const SYSTEM_TO_METAL_LABEL: Record<EuropeanDrawerSystemId, string> = {
  "blum-legrabox": "Blum Legrabox",
  "blum-tandembox-antaro": "Blum Antaro",
  "hettich-innotech-atira": "Hettich InnoTech",
  "grass-nova-pro-scala": "Grass Nova Pro",
};

function europeanGeometryToLayerItemCore(params: {
  id: string;
  parentBoxId: string;
  geometry: DrawerGeometry;
  systemId: EuropeanDrawerSystemId;
  softClose: boolean;
  material?: string;
  frontMaterial?: string;
  isOpen?: boolean;
  dualFront?: boolean;
}): DrawerLayerItem {
  const {
    id,
    parentBoxId,
    geometry,
    systemId,
    softClose,
    material,
    frontMaterial,
    isOpen,
    dualFront,
  } = params;
  const g = geometry;
  const bodyMat = material ?? "mdf_branco";
  const frontMat = frontMaterial ?? bodyMat;
  return {
    id,
    parentBoxId,
    type: "pro",
    drawerType: "pro",
    sideMaterial: "wood",
    slideType: "Genùrica",
    metalBoxType: SYSTEM_TO_METAL_LABEL[systemId] as DrawerLayerItem["metalBoxType"],
    softClose,
    width: g.front.widthMm,
    height: g.front.heightMm,
    depth: g.bodyDepthMm,
    frontThickness: g.front.thicknessMm,
    frontIntWidth: g.frontInt?.widthMm,
    frontIntHeight: g.frontInt?.heightMm,
    frontIntThickness: g.frontInt?.thicknessMm,
    bodyWidth: g.externalWidthMm,
    bodyHeight: g.usefulHeightMm,
    bodyDepth: g.bodyDepthMm,
    bottomWidth: g.bottom.widthMm,
    bottomDepth: g.bottom.depthMm,
    bottomThickness: g.bottom.thicknessMm,
    backWidth: g.back.widthMm,
    backHeight: g.back.heightMm,
    backThickness: g.back.thicknessMm,
    sideThickness: EUROPEAN_SIDE_THICKNESS_MM,
    leftSideWidth: g.leftSide.widthMm,
    leftSideHeight: g.leftSide.heightMm,
    leftSideDepth: g.leftSide.depthMm,
    rightSideWidth: g.rightSide.widthMm,
    rightSideHeight: g.rightSide.heightMm,
    rightSideDepth: g.rightSide.depthMm,
    frontPosX: g.front.originXMm,
    frontPosY: g.front.originYMm,
    frontPosZ: g.front.originZMm,
    bottomPosX: g.bottom.originXMm,
    bottomPosY: g.bottom.originYMm,
    bottomPosZ: g.bottom.originZMm,
    backPosX: g.back.originXMm,
    backPosY: g.back.originYMm,
    backPosZ: g.back.originZMm,
    leftSidePosX: g.leftSide.originXMm,
    leftSidePosY: g.leftSide.originYMm,
    leftSidePosZ: g.leftSide.originZMm,
    rightSidePosX: g.rightSide.originXMm,
    rightSidePosY: g.rightSide.originYMm,
    rightSidePosZ: g.rightSide.originZMm,
    material: frontMat,
    materialId: frontMat,
    openDirection: "pull",
    isOpen: isOpen ?? false,
    pullDistanceMm: Math.max(100, g.runnerDepthMm - 40),
    posX: g.front.originXMm,
    posY: g.front.originYMm,
    posZ: g.front.originZMm,
    rotY: 0,
    metadata: {
      metalBoxProfileId: systemId,
      metalBoxHeightMm: g.usefulHeightMm,
      nominalDepth: g.runnerDepthMm,
      europeanSystemId: systemId,
      modeloB: true,
      frontMaterial: frontMat,
      frontHeightMm: g.front.heightMm,
      dualFront: dualFront === true,
      bodyMaterial: bodyMat,
    } as DrawerLayerItem["metadata"],
  };
}

/**
 * Layer memoizado. Material da frente faz parte da chave ó
 * mudanÁa sÛ de material reutiliza hit se args iguais; dims iguais + mat diferente = sÛ overlay leve via cache miss mÌnimo.
 */
export const europeanGeometryToLayerItem = memo(europeanGeometryToLayerItemCore, {
  namespace: "eu.adapter.layer",
  maxSize: 256,
});

export function europeanCutlistToCutListItems(
  items: DrawerCutlistItem[],
  boxId: string
): CutListItem[] {
  return items
    .filter((i) => i.kind === "wood")
    .map((i) => ({
      id: i.id,
      nome: i.industrialLabel ?? i.nome,
      quantidade: i.quantidade,
      dimensoes: {
        largura: i.larguraMm,
        altura: i.alturaMm,
        profundidade: i.espessuraMm,
      },
      espessura: i.espessuraMm,
      material: i.material,
      tipo: i.tipo,
      boxId,
      sourceType: "parametric" as const,
      metadata: {
        modeloB: true,
        observacoesIndustriais: i.observacoesIndustriais,
        kind: i.kind,
        codigo: i.codigo,
        industrialLabel: i.industrialLabel,
        pieceName: i.nome,
      },
    }));
}

export function europeanResultToLayerItems(
  result: EuropeanDrawerResult,
  boxId: string,
  options?: { material?: string; frontMaterial?: string }
): DrawerLayerItem[] {
  const bodyMat = options?.material ?? result.config.frontMaterialId;
  const frontMat =
    options?.frontMaterial ?? result.config.frontMaterialId ?? options?.material;
  return result.viewer.drawers.map((d) =>
    europeanGeometryToLayerItem({
      id: d.id,
      parentBoxId: boxId,
      geometry: d.geometry,
      systemId: result.systemId,
      softClose: result.config.softClose,
      material: bodyMat,
      frontMaterial: frontMat,
      dualFront: result.config.dualFront,
    })
  );
}

export function collectModuleLateralDrillHoles(
  holes: EuropeanDrawerHole[],
  side: "module_lat_esq" | "module_lat_dir"
): PanelDrillHole[] {
  return europeanHolesToPanelDrillHoles(holes, side);
}
