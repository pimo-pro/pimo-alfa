import type { WorkspaceBox } from "../core/types";
import { getSettings } from "../core/settings/settingsService";
import type { DoorLayerItem, DrawerLayerItem } from "../models/BoxLayers";
import {
  generateDrawerGroup,
  drawerGroupToLayerItems,
  drawerToLayerItem,
  type DrawerGenerationConfig,
} from "../core/drawers";
import { buildDrawerParametricOverridesList } from "../core/drawers/drawerParametricOverrides";
import { devLogger } from "../utils/devLogger";
import { getDefaultOfficialMaterial } from "../core/materials/materials.api";
import {
  computeWardrobeLocalLayout,
  getWardrobeDoorCountForWidth,
  getWardrobeGroupFromBaseCabinetId,
  hasWardrobeLowerDrawers,
  isWardrobeModel,
} from "../core/wardrobe/wardrobeRules";
import { getCornerCabinetConfig, computeCornerLayoutForBox } from "../core/cornerCabinet";
import {
  backupLayerMaterials,
  restoreLayerMaterials,
} from "../core/viewer/materialPreservation";

export interface BoxLayersState {
  doorsLayer: DoorLayerItem[];
  drawersLayer: DrawerLayerItem[];
}

export type RegenerateLayersOptions = {
  /** Quando true (padrão em resize), preserva materialId/material das layers existentes. */
  preserveMaterials?: boolean;
};

const MM_EPS = 1;

const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const clamp = (value: number, min: number) => Math.max(min, Number.isFinite(value) ? value : min);

const _defaultMaterial = getDefaultOfficialMaterial();
const defaultDoorMaterial = _defaultMaterial.canonicalId;
const defaultDrawerMaterial = _defaultMaterial.canonicalId;

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
    drawerSettings,
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

export function regenerateLayersForBox(
  box: WorkspaceBox,
  options?: RegenerateLayersOptions
): BoxLayersState {
  const preserveMaterials = options?.preserveMaterials !== false;
  const materialBackup = preserveMaterials ? backupLayerMaterials(box) : null;
  const settings = getSettings();
  const boxWidth = clamp(box.dimensoes.largura, 100);
  const boxHeight = clamp(box.dimensoes.altura, 100);
  const boxDepth = clamp(box.dimensoes.profundidade, 100);
  const thickness = clamp(box.espessura, 18);

  const drawerCount = Math.max(0, Math.floor(box.gavetas || 0));
  const hasDrawers = drawerCount > 0;

  const doorsLayer: DoorLayerItem[] = [];
  const drawersLayer: DrawerLayerItem[] = [];

  // PORTAS: criar se portaTipo exigir (mesmo que existam gavetas/prateleiras).
  if (box.portaTipo === "porta_simples" || box.portaTipo === "porta_dupla") {
    const gapVertical = clamp(settings.portas.portaGapVerticalMm, 0);
    const gapHorizontal = clamp(settings.portas.portaGapHorizontalMm, 0);
    const doorGap = clamp(settings.portas.portaGapDuplaMm, 0);

    const cornerCfg = getCornerCabinetConfig(box.baseCabinetId);
    if (cornerCfg && box.portaTipo === "porta_simples") {
      const layout = computeCornerLayoutForBox(box, {
        gapVerticalMm: gapVertical,
        gapHorizontalMm: gapHorizontal,
        doorPosZOffsetMm: settings.portas.portaPosZOffsetMm,
      });
      if (layout) {
        const doorPosZ = boxDepth / 2 + clamp(settings.portas.portaPosZOffsetMm, 0);
        doorsLayer.push({
          id: createId("door"),
          parentBoxId: box.id,
          groupType: "simples",
          width: layout.doorWidthMm,
          height: layout.doorHeightMm,
          thickness,
          materialId: defaultDoorMaterial,
          material: defaultDoorMaterial,
          openDirection: layout.door.openDirection,
          isOpen: false,
          hingeSide: layout.door.hingeSide,
          pivot: layout.door.pivot,
          posX: layout.door.pivotX,
          posY: layout.door.posY,
          posZ: doorPosZ,
          rotY: 0,
        });
      }
    } else {
    const doorHeight = clamp(boxHeight - 2 * gapVertical, MM_EPS);
    const doorWidth = clamp(boxWidth - 2 * gapHorizontal, MM_EPS);
    // Center the door vertically: Y=0 is box center
    const doorPosY = 0;
    // Door posZ: fora da caixa (face frontal externa)
    const doorPosZ = boxDepth / 2 + clamp(settings.portas.portaPosZOffsetMm, 0);
    const wardrobeGroup = getWardrobeGroupFromBaseCabinetId(box.baseCabinetId);
    // Regra de engenharia de portas (max 600mm por folha) aplica a todos os grupos de roupeiro (H/J/T).
    const forcedDoorCount = wardrobeGroup ? getWardrobeDoorCountForWidth(boxWidth) : null;

    if (forcedDoorCount === 3) {
      const leafWidth = clamp((boxWidth - 2 * gapHorizontal - 2 * doorGap) / 3, MM_EPS);
      const leftEdgeX = -boxWidth / 2 + gapHorizontal;
      const makeDoor = (
        idx: number,
        openDirection: "left" | "right",
        hingeSide: "left" | "right",
        pivot: "left-edge" | "right-edge"
      ) => {
        const doorLeft = leftEdgeX + idx * (leafWidth + doorGap);
        const pivotX = pivot === "left-edge" ? doorLeft : doorLeft + leafWidth;
        doorsLayer.push({
          id: createId("door"),
          parentBoxId: box.id,
          groupType: "dupla",
          width: leafWidth,
          height: doorHeight,
          thickness,
          materialId: defaultDoorMaterial,
          material: defaultDoorMaterial,
          openDirection,
          isOpen: false,
          hingeSide,
          pivot,
          posX: pivotX,
          posY: doorPosY,
          posZ: doorPosZ,
          rotY: 0,
        });
      };

      // Folha 1 (esquerda) abre para esquerda; folhas 2/3 para direita.
      makeDoor(0, "left", "left", "left-edge");
      makeDoor(1, "right", "right", "right-edge");
      makeDoor(2, "right", "right", "right-edge");
    } else if (box.portaTipo === "porta_dupla") {
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
          material: defaultDoorMaterial,
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
          material: defaultDoorMaterial,
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
        material: defaultDoorMaterial,
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
  }

  // GAVETAS:
  // - Geral: gerar se gavetas > 0
  // - Roupeiro H/J (cfg7/cfg8): gerar apenas no lado direito e apenas na zona inferior
  if (hasDrawers) {
    const drawerSettings = settings.gavetas;
    const drawerType = box.drawerType ?? "normal";
    const mode = box.drawerHeightMode ?? drawerSettings.gavetaAlturaModoPadrao;
    const customHeights = mode === "custom" ? (box.drawersLayer ?? []).map((item) => item.height) : undefined;

    // Usar o domínio de drawers para gerar gavetas
    const isWardrobe = isWardrobeModel(box.baseCabinetId);
    const wardrobeGroup = getWardrobeGroupFromBaseCabinetId(box.baseCabinetId);
    const shouldWardrobeLowerRightDrawers =
      isWardrobe && wardrobeGroup !== "T" && hasWardrobeLowerDrawers(box.baseCabinetId) && boxWidth >= 1200;

    const feetHeightMm = Math.max(40, box.feetHeight ?? (box.pe_cm ?? 10) * 10);
    const drawerOverrides = buildDrawerParametricOverridesList(box.drawersLayer, drawerCount);

    const config: DrawerGenerationConfig = (() => {
      if (!shouldWardrobeLowerRightDrawers) {
        return {
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
          drawerSettings,
          materialId: defaultDrawerMaterial,
          drawerOverrides,
        };
      }

      const layout = computeWardrobeLocalLayout({
        baseCabinetId: box.baseCabinetId,
        widthMm: boxWidth,
        heightMm: boxHeight,
        depthMm: boxDepth,
        feetHeightMm,
      });

      return {
        boxWidth: layout.drawerCompartmentBoxWidthForGen_mm ?? boxWidth,
        boxHeight: layout.drawerCompartmentBoxHeightForGen_mm ?? boxHeight,
        boxDepth,
        boxThickness: thickness,
        boxId: box.id,
        drawerCount,
        drawerType,
        heightMode: "equal", // regra obrigatória: 3 gavetas, distribuídas uniformemente
        availableDepths: drawerSettings.gavetaProfundidadesDisponiveisMm,
        drawerSettings,
        materialId: defaultDrawerMaterial,
        originX: layout.drawerOriginXLocal_mm ?? 0,
        originY: layout.drawerOriginYLocal_mm ?? 0,
        customHeights: undefined,
        drawerOverrides,
      };
    })();

    const drawerGroup = generateDrawerGroup(config);
    const generatedDrawers = drawerGroupToLayerItems(drawerGroup);

    // Preserva estado e configuração UI das gavetas existentes
    for (let i = 0; i < generatedDrawers.length; i++) {
      const existing = (box.drawersLayer ?? [])[i];
      if (existing) {
        generatedDrawers[i] = {
          ...generatedDrawers[i],
          isOpen: existing.isOpen ?? false,
          materialId: existing.materialId ?? defaultDrawerMaterial,
          material: existing.material ?? defaultDrawerMaterial,
          type: existing.type ?? existing.drawerType ?? generatedDrawers[i].type,
          drawerType: existing.drawerType ?? existing.type ?? generatedDrawers[i].drawerType,
          slideType: existing.slideType ?? generatedDrawers[i].slideType,
          metalBoxType: existing.metalBoxType ?? generatedDrawers[i].metalBoxType,
          softClose: existing.softClose ?? generatedDrawers[i].softClose,
          handleType: existing.handleType ?? generatedDrawers[i].handleType,
          handlePosition: existing.handlePosition ?? generatedDrawers[i].handlePosition,
          handleOffsetMm: existing.handleOffsetMm ?? generatedDrawers[i].handleOffsetMm,
          metadata: existing.metadata ?? generatedDrawers[i].metadata,
        };
      } else {
        generatedDrawers[i].material = defaultDrawerMaterial;
      }
    }

    drawersLayer.push(...generatedDrawers);
  }

  if (import.meta.env.DEV) {
    for (const door of doorsLayer) {
      devLogger.debug("door", { posX: door.posX, posY: door.posY, posZ: door.posZ, width: door.width, height: door.height, depth: door.thickness });
    }
    for (const drawer of drawersLayer) {
      devLogger.debug("drawer", { posX: drawer.posX, posY: drawer.posY, posZ: drawer.posZ, width: drawer.width, height: drawer.height, depth: drawer.depth });
    }
  }

  const generated = { doorsLayer, drawersLayer };
  if (materialBackup) {
    return restoreLayerMaterials(generated, materialBackup);
  }
  return generated;
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
    material: defaultDoorMaterial,
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
    drawerSettings,
    materialId: defaultDrawerMaterial,
  };

  const drawerGroup = generateDrawerGroup(config);
  return { ...drawerToLayerItem(drawerGroup.drawers[0]), material: defaultDrawerMaterial };
}
