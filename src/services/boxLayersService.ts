import type { WorkspaceBox } from "../core/types";
import { getSettings } from "../core/settings/settingsService";
import type { DoorLayerItem, DrawerLayerItem } from "../models/BoxLayers";
import {
  generateDrawerGroup,
  drawerGroupToLayerItems,
  drawerToLayerItem,
  type DrawerGenerationConfig,
} from "../core/drawers";
import { devLogger } from "../utils/devLogger";

export interface BoxLayersState {
  doorsLayer: DoorLayerItem[];
  drawersLayer: DrawerLayerItem[];
}

const MM_EPS = 1;

const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const clamp = (value: number, min: number) => Math.max(min, Number.isFinite(value) ? value : min);

const defaultDoorMaterial = "";
const defaultDrawerMaterial = "";

/**
 * Aplica regras de tipo de gaveta (delegando ao domínio de drawers)
 * @deprecated Use generateDrawerGroup from drawers domain instead
 */
export const applyDrawerTypeRules = (
  box: WorkspaceBox,
  drawer: DrawerLayerItem,
  settings = getSettings()
): DrawerLayerItem => {
  // Delegando ao domínio de drawers
  const drawerSettings = settings.gavetas;
  const config: DrawerGenerationConfig = {
    boxWidth: box.dimensoes.largura,
    boxHeight: box.dimensoes.altura,
    boxDepth: box.dimensoes.profundidade,
    boxThickness: box.espessura || 18,
    boxId: box.id,
    drawerCount: 1,
    drawerType: drawer.type ?? drawer.drawerType ?? box.drawerType ?? "normal",
    heightMode: "equal",
    customHeights: [drawer.height],
    availableDepths: drawerSettings.gavetaProfundidadesDisponiveisMm,
    materialId: drawer.materialId,
  };

  const group = generateDrawerGroup(config);
  const layerItem = drawerToLayerItem(group.drawers[0]);

  // Preserva estado de abertura
  return {
    ...layerItem,
    isOpen: drawer.isOpen,
    posY: drawer.posY,
  };
};

export function regenerateLayersForBox(box: WorkspaceBox): BoxLayersState {
  const settings = getSettings();
  const boxWidth = clamp(box.dimensoes.largura, 100);
  const boxHeight = clamp(box.dimensoes.altura, 100);
  const boxDepth = clamp(box.dimensoes.profundidade, 100);
  const thickness = clamp(box.espessura, 18);

  const drawerCount = Math.max(0, Math.floor(box.gavetas || 0));
  const hasDrawers = drawerCount > 0 && box.portaTipo === "sem_porta" && (box.prateleiras ?? 0) === 0;

  const doorsLayer: DoorLayerItem[] = [];
  const drawersLayer: DrawerLayerItem[] = [];

  // PORTAS: Só criar se explicitamente porta_simples ou porta_dupla e nao houver gavetas
  if (!hasDrawers && (box.portaTipo === "porta_simples" || box.portaTipo === "porta_dupla")) {
    const gapVertical = clamp(settings.portas.portaGapVerticalMm, 0);
    const gapHorizontal = clamp(settings.portas.portaGapHorizontalMm, 0);
    const doorGap = clamp(settings.portas.portaGapDuplaMm, 0);
    const doorHeight = clamp(boxHeight - 2 * gapVertical, MM_EPS);
    const doorWidth = clamp(boxWidth - 2 * gapHorizontal, MM_EPS);
    // Center the door vertically: Y=0 is box center
    const doorPosY = 0;
    // Door posZ: fora da caixa (face frontal externa)
    const doorPosZ = boxDepth / 2 + clamp(settings.portas.portaPosZOffsetMm, 0);

    if (box.portaTipo === "porta_dupla") {
      const leafWidth = clamp((boxWidth - 2 * gapHorizontal - doorGap) / 2, MM_EPS);
      const leftCenterX = -(leafWidth / 2 + doorGap / 2);
      const rightCenterX = leafWidth / 2 + doorGap / 2;
      const leftPivotX = leftCenterX - leafWidth / 2;
      const rightPivotX = rightCenterX + leafWidth / 2;
      // PORTAS DUPLAS: Gap de 2mm entre portas, centros conforme especificacao
      doorsLayer.push(
        {
          id: createId("door"),
          parentBoxId: box.id,
          groupType: "dupla",
          width: leafWidth,
          height: doorHeight,
          thickness,
          materialId: defaultDoorMaterial,
          openDirection: "left",
          isOpen: false,
          hingeSide: "left",
          pivot: "left-edge",
          posX: leftPivotX,
          posY: doorPosY,
          posZ: doorPosZ,
          rotY: 0,
        },
        {
          id: createId("door"),
          parentBoxId: box.id,
          groupType: "dupla",
          width: leafWidth,
          height: doorHeight,
          thickness,
          materialId: defaultDoorMaterial,
          openDirection: "right",
          isOpen: false,
          hingeSide: "right",
          pivot: "right-edge",
          posX: rightPivotX,
          posY: doorPosY,
          posZ: doorPosZ,
          rotY: 0,
        }
      );
    } else {
      const doorCenterX = 0;
      const doorPivotX = doorCenterX - doorWidth / 2;
      doorsLayer.push({
        id: createId("door"),
        parentBoxId: box.id,
        groupType: "simples",
        width: doorWidth,
        height: doorHeight,
        thickness,
        materialId: defaultDoorMaterial,
        openDirection: "left",
        isOpen: false,
        hingeSide: "left",
        pivot: "left-edge",
        posX: doorPivotX,
        posY: doorPosY,
        posZ: doorPosZ,
        rotY: 0,
      });
    }
  }

  // GAVETAS: Só criar se gavetas > 0 e sem portas/prateleiras
  if (hasDrawers) {
    const drawerSettings = settings.gavetas;
    const drawerType = box.drawerType ?? "normal";
    const mode = box.drawerHeightMode ?? drawerSettings.gavetaAlturaModoPadrao;
    const customHeights = mode === "custom" ? (box.drawersLayer ?? []).map((item) => item.height) : undefined;

    // Usar o domínio de drawers para gerar gavetas
    const config: DrawerGenerationConfig = {
      boxWidth,
      boxHeight,
      boxDepth,
      boxThickness: thickness,
      boxId: box.id,
      drawerCount,
      drawerType,
      heightMode: mode,
      customHeights,
      availableDepths: drawerSettings.gavetaProfundidadesDisponiveisMm,
      materialId: defaultDrawerMaterial,
    };

    const drawerGroup = generateDrawerGroup(config);
    const generatedDrawers = drawerGroupToLayerItems(drawerGroup);

    // Preserva estado de abertura das gavetas existentes
    for (let i = 0; i < generatedDrawers.length; i++) {
      const existing = (box.drawersLayer ?? [])[i];
      if (existing) {
        generatedDrawers[i].isOpen = existing.isOpen ?? false;
        generatedDrawers[i].materialId = existing.materialId ?? defaultDrawerMaterial;
      }
    }

    drawersLayer.push(...generatedDrawers);
  }

  for (const door of doorsLayer) {
    devLogger.debug("door", {
      posX: door.posX,
      posY: door.posY,
      posZ: door.posZ,
      width: door.width,
      height: door.height,
      depth: door.thickness,
    });
  }

  for (const drawer of drawersLayer) {
    devLogger.debug("drawer", {
      posX: drawer.posX,
      posY: drawer.posY,
      posZ: drawer.posZ,
      width: drawer.width,
      height: drawer.height,
      depth: drawer.depth,
    });
  }

  return { doorsLayer, drawersLayer };
}

export function createManualDoor(box: WorkspaceBox): DoorLayerItem {
  const settings = getSettings();
  const thickness = clamp(box.espessura, 18);
  const gapVertical = clamp(settings.portas.portaGapVerticalMm, 0);
  const gapHorizontal = clamp(settings.portas.portaGapHorizontalMm, 0);
  const doorHeight = clamp(box.dimensoes.altura - 2 * gapVertical, 120);
  const doorWidth = clamp(box.dimensoes.largura - 2 * gapHorizontal, 80);
  return {
    id: createId("door"),
    parentBoxId: box.id,
    groupType: "simples",
    width: doorWidth,
    height: doorHeight,
    thickness,
    materialId: defaultDoorMaterial,
    openDirection: "left",
    isOpen: false,
    hingeSide: "left",
    pivot: "left-edge",
    posX: -doorWidth / 2,
    posY: 0,  // Centered at box center
    posZ: box.dimensoes.profundidade / 2 + clamp(settings.portas.portaPosZOffsetMm, 0),
    rotY: 0,
  };
}

export function createManualDrawer(box: WorkspaceBox): DrawerLayerItem {
  const settings = getSettings();
  const thickness = clamp(box.espessura, 18);
  const drawerSettings = settings.gavetas;
  const drawerType = box.drawerType ?? "normal";
  const mode = box.drawerHeightMode ?? drawerSettings.gavetaAlturaModoPadrao;

  // Usar o domínio de drawers
  const config: DrawerGenerationConfig = {
    boxWidth: box.dimensoes.largura,
    boxHeight: box.dimensoes.altura,
    boxDepth: box.dimensoes.profundidade,
    boxThickness: thickness,
    boxId: box.id,
    drawerCount: 1,
    drawerType,
    heightMode: mode,
    availableDepths: drawerSettings.gavetaProfundidadesDisponiveisMm,
    materialId: defaultDrawerMaterial,
  };

  const drawerGroup = generateDrawerGroup(config);
  return drawerToLayerItem(drawerGroup.drawers[0]);
}
