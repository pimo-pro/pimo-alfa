import type { DoorLayerItem, DrawerLayerItem } from "../../models/BoxLayers";
import {
  backupDoorManualDimensions,
  restoreDoorManualDimensions,
  type DoorManualDimensionBackup,
} from "../doors/doorLayerGeometry";

export type LayerMaterialBackup = {
  doors: Map<number, { materialId?: string; material?: string; id?: string; manual?: DoorManualDimensionBackup }>;
  drawers: Map<
    number,
    { materialId?: string; material?: string; id?: string; frontMaterial?: string }
  >;
  boxMaterial?: string;
};

/** Cria backup de materiais das layers antes de regeneração geométrica. */
export function backupLayerMaterials(box: {
  material?: string;
  doorsLayer?: DoorLayerItem[];
  drawersLayer?: DrawerLayerItem[];
}): LayerMaterialBackup {
  const doors = new Map<number, { materialId?: string; material?: string; id?: string; manual?: DoorManualDimensionBackup }>();
  const drawers = new Map<
    number,
    { materialId?: string; material?: string; id?: string; frontMaterial?: string }
  >();
  (box.doorsLayer ?? []).forEach((door, index) => {
    doors.set(index, {
      id: door.id,
      materialId: door.materialId,
      material: door.material,
      manual: backupDoorManualDimensions(door),
    });
  });
  (box.drawersLayer ?? []).forEach((drawer, index) => {
    drawers.set(index, {
      id: drawer.id,
      materialId: drawer.materialId,
      material: drawer.material,
      frontMaterial: drawer.metadata?.frontMaterial,
    });
  });
  return { doors, drawers, boxMaterial: box.material };
}

function applyDoorMaterial(
  door: DoorLayerItem,
  backup: { materialId?: string; material?: string; id?: string; manual?: DoorManualDimensionBackup } | undefined
): DoorLayerItem {
  if (!backup) return door;
  const materialId = backup.materialId ?? backup.material ?? door.materialId;
  const material = backup.material ?? backup.materialId ?? door.material;
  const withMaterial = {
    ...door,
    id: backup.id ?? door.id,
    materialId,
    material,
  };
  return restoreDoorManualDimensions(withMaterial, backup.manual);
}

function applyDrawerMaterial(
  drawer: DrawerLayerItem,
  backup:
    | { materialId?: string; material?: string; id?: string; frontMaterial?: string }
    | undefined
): DrawerLayerItem {
  if (!backup) return drawer;
  const materialId = backup.materialId ?? backup.material ?? drawer.materialId;
  const material = backup.material ?? backup.materialId ?? drawer.material;
  const frontMaterial =
    backup.frontMaterial ?? backup.materialId ?? backup.material ?? drawer.metadata?.frontMaterial;
  return {
    ...drawer,
    id: backup.id ?? drawer.id,
    materialId,
    material,
    metadata: {
      ...drawer.metadata,
      ...(frontMaterial ? { frontMaterial } : {}),
    },
  };
}

/** Restaura materiais após regeneração; nunca redefine para default se havia backup. */
export function restoreLayerMaterials(
  generated: { doorsLayer: DoorLayerItem[]; drawersLayer: DrawerLayerItem[] },
  backup: LayerMaterialBackup
): { doorsLayer: DoorLayerItem[]; drawersLayer: DrawerLayerItem[] } {
  return {
    doorsLayer: generated.doorsLayer.map((door, index) => applyDoorMaterial(door, backup.doors.get(index))),
    drawersLayer: generated.drawersLayer.map((drawer, index) =>
      applyDrawerMaterial(drawer, backup.drawers.get(index))
    ),
  };
}
