import type { BoxModel } from "../models/BoxModel";
import type { DoorOrDrawer } from "../models/DoorOrDrawer";

const DEFAULT_FACE_OFFSET_MM = 2;
const MIN_DRAWER_HEIGHT_MM = 120;

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

export function generateDoorsAndDrawersForBox(box: BoxModel): DoorOrDrawer[] {
  const internal = getInternalBoxDimensions(box);
  const items: DoorOrDrawer[] = [];

  const boxWidth = Math.max(1, box.dimensoes.largura);
  const boxHeight = Math.max(1, box.dimensoes.altura);
  const boxDepth = Math.max(1, box.dimensoes.profundidade);

  const folgaLateral = 2;
  const folgaSuperior = 2;
  const folgaInferior = 2;
  const folgaCentral = 2;
  const folgaVertical = 2;

  const espessuraPorta = Math.max(1, internal.thickness);
  const espessuraFrente = Math.max(1, internal.thickness);

  const portaPosY = boxHeight / 2;
  const portaPosZ = boxDepth / 2 + espessuraPorta / 2;

  // Regra explícita: sem porta => sem doorsAndDrawers
  if (box.portaTipo === "sem_porta") {
    return [];
  }

  if (box.portaTipo === "porta_dupla") {
    const doorWidth = Math.max(1, boxWidth / 2 - folgaCentral - folgaLateral);
    const doorHeight = Math.max(1, boxHeight - folgaSuperior - folgaInferior);
    items.push(
      {
        id: createId(),
        parentBoxId: box.id,
        type: "door",
        width: doorWidth,
        height: doorHeight,
        depth: espessuraPorta,
        thickness: espessuraPorta,
        openDirection: "left",
        isOpen: false,
        offsetX: -(doorWidth / 2),
        offsetY: 0,
        offsetZ: DEFAULT_FACE_OFFSET_MM,
        posX: -(doorWidth / 2),
        posY: portaPosY,
        posZ: portaPosZ,
        rotY: 0,
        hingeSide: "left",
        pivot: "left-edge",
      },
      {
        id: createId(),
        parentBoxId: box.id,
        type: "door",
        width: doorWidth,
        height: doorHeight,
        depth: espessuraPorta,
        thickness: espessuraPorta,
        openDirection: "right",
        isOpen: false,
        offsetX: doorWidth / 2,
        offsetY: 0,
        offsetZ: DEFAULT_FACE_OFFSET_MM,
        posX: doorWidth / 2,
        posY: portaPosY,
        posZ: portaPosZ,
        rotY: 0,
        hingeSide: "right",
        pivot: "right-edge",
      }
    );
  } else {
    const doorWidth = Math.max(1, boxWidth - folgaLateral * 2);
    const doorHeight = Math.max(1, boxHeight - folgaSuperior - folgaInferior);
    items.push({
      id: createId(),
      parentBoxId: box.id,
      type: "door",
      width: doorWidth,
      height: doorHeight,
      depth: espessuraPorta,
      thickness: espessuraPorta,
      openDirection: "left",
      isOpen: false,
      offsetX: 0,
      offsetY: 0,
      offsetZ: DEFAULT_FACE_OFFSET_MM,
      posX: 0,
      posY: portaPosY,
      posZ: portaPosZ,
      rotY: 0,
      hingeSide: "left",
      pivot: "left-edge",
    });
  }

  const gavetasCount = Math.max(0, Math.floor(box.gavetas || 0));
  if (gavetasCount > 0) {
    const gavetaHeight = Math.max(
      MIN_DRAWER_HEIGHT_MM,
      boxHeight / gavetasCount - folgaVertical
    );
    const gavetaWidth = Math.max(1, boxWidth - folgaLateral * 2);
    const gavetaPosZ = boxDepth / 2 + espessuraFrente / 2;

    for (let index = 0; index < gavetasCount; index += 1) {
      const posY = index * gavetaHeight + gavetaHeight / 2;
      items.push({
        id: createId(),
        parentBoxId: box.id,
        type: "drawer",
        width: gavetaWidth,
        height: gavetaHeight,
        depth: Math.max(1, internal.depth),
        thickness: espessuraFrente,
        openDirection: "pull",
        isOpen: false,
        offsetX: 0,
        offsetY: posY - boxHeight / 2,
        offsetZ: DEFAULT_FACE_OFFSET_MM,
        posX: 0,
        posY,
        posZ: gavetaPosZ,
        rotY: 0,
        pivot: "front",
      });
    }
  }

  return items;
}
