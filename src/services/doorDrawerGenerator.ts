import type { BoxModel } from "../models/BoxModel";
import type { DoorOrDrawer } from "../models/DoorOrDrawer";

const DEFAULT_FACE_OFFSET_MM = 2;
const DEFAULT_DRAWER_SPACING_MM = 2;
const MIN_DRAWER_HEIGHT_MM = 120;
const MAX_AUTO_DRAWERS = 6;

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

function getInternalBoxDimensions(box: BoxModel) {
  const thickness = Math.max(1, box.espessura || 18);
  return {
    width: Math.max(50, box.dimensoes.largura - thickness * 2),
    height: Math.max(50, box.dimensoes.altura - thickness * 2),
    depth: Math.max(50, box.dimensoes.profundidade - thickness),
    thickness,
  };
}

function getDrawerCount(box: BoxModel, internalHeight: number) {
  if (box.gavetas > 0) return Math.min(MAX_AUTO_DRAWERS, Math.max(1, Math.floor(box.gavetas)));
  return Math.min(MAX_AUTO_DRAWERS, Math.max(1, Math.floor(internalHeight / 220)));
}

export function generateDoorsAndDrawersForBox(box: BoxModel): DoorOrDrawer[] {
  const internal = getInternalBoxDimensions(box);
  const items: DoorOrDrawer[] = [];
  const hasDoors = box.portaTipo !== "sem_porta";

  if (hasDoors) {
    if (box.portaTipo === "porta_dupla") {
      const halfWidth = Math.max(50, internal.width / 2 - DEFAULT_DRAWER_SPACING_MM);
      items.push(
        {
          id: createId(),
          parentBoxId: box.id,
          type: "door",
          width: halfWidth,
          height: internal.height,
          depth: internal.thickness,
          thickness: internal.thickness,
          openDirection: "left",
          isOpen: false,
          offsetX: -halfWidth / 2,
          offsetY: 0,
          offsetZ: DEFAULT_FACE_OFFSET_MM,
        },
        {
          id: createId(),
          parentBoxId: box.id,
          type: "door",
          width: halfWidth,
          height: internal.height,
          depth: internal.thickness,
          thickness: internal.thickness,
          openDirection: "right",
          isOpen: false,
          offsetX: halfWidth / 2,
          offsetY: 0,
          offsetZ: DEFAULT_FACE_OFFSET_MM,
        }
      );
    } else {
      items.push({
        id: createId(),
        parentBoxId: box.id,
        type: "door",
        width: internal.width,
        height: internal.height,
        depth: internal.thickness,
        thickness: internal.thickness,
        openDirection: "right",
        isOpen: false,
        offsetX: 0,
        offsetY: 0,
        offsetZ: DEFAULT_FACE_OFFSET_MM,
      });
    }
  }

  const drawerCount = getDrawerCount(box, internal.height);
  if (drawerCount > 0 && box.gavetas > 0) {
    const totalSpacing = (drawerCount - 1) * DEFAULT_DRAWER_SPACING_MM;
    const eachHeight = Math.max(
      MIN_DRAWER_HEIGHT_MM,
      Math.floor((internal.height - totalSpacing) / drawerCount)
    );
    let currentY = internal.height / 2 - eachHeight / 2;

    for (let i = 0; i < drawerCount; i += 1) {
      items.push({
        id: createId(),
        parentBoxId: box.id,
        type: "drawer",
        width: internal.width,
        height: eachHeight,
        depth: internal.depth,
        thickness: internal.thickness,
        openDirection: "pull",
        isOpen: false,
        offsetX: 0,
        offsetY: currentY,
        offsetZ: DEFAULT_FACE_OFFSET_MM,
      });
      currentY -= eachHeight + DEFAULT_DRAWER_SPACING_MM;
    }
  }

  return items;
}
