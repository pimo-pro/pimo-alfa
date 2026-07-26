/**
 * adapter/ — Converte resultado Modelo B ? DrawerLayerItem / CutListItem.
 * Permite reutilizar viewer/cutlist sem alterar o nucleo do Modelo A.
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

const SYSTEM_TO_METAL_LABEL: Record<EuropeanDrawerSystemId, string> = {
  "blum-legrabox": "Blum Legrabox",
  "blum-tandembox-antaro": "Blum Antaro",
  "hettich-innotech-atira": "Hettich InnoTech",
  "grass-nova-pro-scala": "Grass Nova Pro",
};

export function europeanGeometryToLayerItem(params: {
  id: string;
  parentBoxId: string;
  geometry: DrawerGeometry;
  systemId: EuropeanDrawerSystemId;
  softClose: boolean;
  material?: string;
  isOpen?: boolean;
}): DrawerLayerItem {
  const { id, parentBoxId, geometry, systemId, softClose, material, isOpen } = params;
  const g = geometry;
  return {
    id,
    parentBoxId,
    type: "pro",
    drawerType: "pro",
    sideMaterial: "aluminum",
    slideType: "Genérica",
    metalBoxType: SYSTEM_TO_METAL_LABEL[systemId] as DrawerLayerItem["metalBoxType"],
    softClose,
    width: g.front.widthMm,
    height: g.front.heightMm,
    depth: g.runnerDepthMm,
    frontThickness: g.front.thicknessMm,
    bodyWidth: g.internalWidthMm,
    bodyHeight: g.usefulHeightMm,
    bodyDepth: g.runnerDepthMm,
    bottomWidth: g.bottom.widthMm,
    bottomDepth: g.bottom.depthMm,
    bottomThickness: g.bottom.thicknessMm,
    backWidth: g.back.widthMm,
    backHeight: g.back.heightMm,
    backThickness: g.back.thicknessMm,
    leftSideWidth: 0,
    leftSideHeight: 0,
    leftSideDepth: 0,
    rightSideWidth: 0,
    rightSideHeight: 0,
    rightSideDepth: 0,
    frontPosX: g.front.originXMm,
    frontPosY: g.front.originYMm,
    frontPosZ: g.front.originZMm,
    bottomPosX: g.bottom.originXMm,
    bottomPosY: g.bottom.originYMm,
    bottomPosZ: g.bottom.originZMm,
    backPosX: g.back.originXMm,
    backPosY: g.back.originYMm,
    backPosZ: g.back.originZMm,
    material: material ?? "mdf_branco",
    materialId: material ?? "mdf_branco",
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
    } as DrawerLayerItem["metadata"],
  };
}

export function europeanCutlistToCutListItems(
  items: DrawerCutlistItem[],
  boxId: string
): CutListItem[] {
  return items
    .filter((i) => i.kind === "wood")
    .map((i) => ({
      id: i.id,
      nome: i.nome,
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
      },
    }));
}

export function europeanResultToLayerItems(result: EuropeanDrawerResult, boxId: string): DrawerLayerItem[] {
  return result.viewer.drawers.map((d) =>
    europeanGeometryToLayerItem({
      id: d.id,
      parentBoxId: boxId,
      geometry: d.geometry,
      systemId: result.systemId,
      softClose: result.config.softClose,
    })
  );
}

export function collectModuleLateralDrillHoles(
  holes: EuropeanDrawerHole[],
  side: "module_lat_esq" | "module_lat_dir"
): PanelDrillHole[] {
  return europeanHolesToPanelDrillHoles(holes, side);
}
