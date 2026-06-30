import type { WorkspaceBox } from "../types";
import type { DoorLayerItem } from "../../models/BoxLayers";
import { getDefaultOfficialMaterial } from "../materials/materials.api";
import { getSettings } from "../settings/settingsService";
import {
  computeCornerLayoutForBox,
  getCornerCabinetConfig,
  isCornerLayoutSsotModel,
  resolveCornerDoorGapSettings,
  type CornerLayoutMm,
} from "./cornerCabinetRules";

const defaultDoorMaterial = getDefaultOfficialMaterial().canonicalId;

type CornerDoorsLayerBox = Pick<
  WorkspaceBox,
  "id" | "baseCabinetId" | "rotacaoY" | "dimensoes" | "espessura" | "portaTipo" | "doorsLayer"
>;

/** Posicionamento da frente fixa — ocupa o lugar da folha esquerda da porta dupla. */
export type CornerFixedFrontPlacement = {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  /** Centro X (mm) — igual a leftDoor.centerX. */
  posX: number;
  posY: number;
  /** Plano Z frontal — igual a doorsLayer.posZ / door.posZ. */
  posZ: number;
};

export function buildCornerFixedFrontPlacement(
  box: CornerDoorsLayerBox,
  layout: CornerLayoutMm
): CornerFixedFrontPlacement {
  const thickness = Math.max(18, Number(box.espessura) || 18);
  return {
    widthMm: layout.fixedFrontWidthMm,
    heightMm: layout.fixedFrontHeightMm,
    thicknessMm: thickness,
    posX: layout.fixedFront.posX,
    posY: layout.fixedFront.posY,
    posZ: layout.fixedFront.posZ,
  };
}

/**
 * Portas 3D/cutlist para módulos corner: uma única folha a partir do layout industrial.
 * Em modelos v2 (SSOT) ignora totalmente doorsLayer legado (só preserva material/abertura).
 */
export function buildCornerDoorLayerItems(
  box: CornerDoorsLayerBox,
  existingDoors?: DoorLayerItem[]
): DoorLayerItem[] {
  const ssot = isCornerLayoutSsotModel(box.baseCabinetId);
  const cfg = getCornerCabinetConfig(box.baseCabinetId);
  if (!cfg || box.portaTipo !== "porta_simples") {
    return ssot ? [] : (existingDoors ?? []);
  }

  const settings = getSettings();
  const layout = computeCornerLayoutForBox(box, resolveCornerDoorGapSettings(settings));
  if (!layout) return ssot ? [] : (existingDoors ?? []);

  const thickness = Math.max(18, Number(box.espessura) || 18);
  const preserved = ssot
    ? existingDoors?.find((d) => d.hingeSide === layout.door.hingeSide)
    : existingDoors?.find((d) => d.hingeSide === layout.door.hingeSide) ?? existingDoors?.[0];

  return [buildCornerDoorLayerItemFromLayout(box, layout, preserved, thickness)];
}

function buildCornerDoorLayerItemFromLayout(
  box: Pick<WorkspaceBox, "id">,
  layout: NonNullable<ReturnType<typeof computeCornerLayoutForBox>>,
  preserved: DoorLayerItem | undefined,
  thickness: number
): DoorLayerItem {
  return {
    id: preserved?.id ?? `door-${box.id}`,
    parentBoxId: box.id,
    groupType: "simples",
    width: layout.doorWidthMm,
    height: layout.doorHeightMm,
    thickness,
    materialId: preserved?.materialId ?? preserved?.material ?? defaultDoorMaterial,
    material: preserved?.material ?? defaultDoorMaterial,
    openDirection: layout.door.openDirection,
    isOpen: preserved?.isOpen ?? false,
    hingeSide: layout.door.hingeSide,
    pivot: layout.door.pivot,
    posX: layout.door.pivotX,
    posY: layout.door.posY,
    posZ: layout.door.posZ,
    rotY: preserved?.rotY ?? 0,
  };
}

function cornerDoorLayersMatch(current: DoorLayerItem[], expected: DoorLayerItem[]): boolean {
  if (current.length !== expected.length) return false;
  return current.every((door, index) => {
    const next = expected[index];
    if (!next) return false;
    return (
      door.hingeSide === next.hingeSide &&
      door.width === next.width &&
      door.height === next.height &&
      door.posX === next.posX &&
      door.posY === next.posY &&
      door.posZ === next.posZ
    );
  });
}

/** Corrige doorsLayer legado em caixas corner já persistidas no projeto. */
export function syncCornerWorkspaceBoxDoorsLayer<T extends CornerDoorsLayerBox>(box: T): T {
  const cfg = getCornerCabinetConfig(box.baseCabinetId);
  if (!cfg || box.portaTipo !== "porta_simples") return box;

  const expected = buildCornerDoorLayerItems(box, box.doorsLayer);
  if (expected.length === 0) return box;

  if (isCornerLayoutSsotModel(box.baseCabinetId)) {
    return { ...box, doorsLayer: expected };
  }

  const current = box.doorsLayer ?? [];
  if (cornerDoorLayersMatch(current, expected)) return box;
  return { ...box, doorsLayer: expected };
}
