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
import { resolveDrawerErgonomicsRules } from "../core/drawers/drawerErgonomicsContext";
import { isErgonomicDrawerHeightMode } from "../core/drawers/drawerHeightModeTypes";
import { devLogger } from "../utils/devLogger";
import { getDefaultOfficialMaterial, resolveCostaThicknessMm } from "../core/materials/materials.api";
import { getProfundidadeInternaUtilMm } from "../core/box/boxDepthHelpers";
import {
  computeWardrobeLocalLayout,
  getWardrobeDoorCountForWidth,
  getWardrobeGroupFromBaseCabinetId,
  hasWardrobeLowerDrawers,
  isWardrobeModel,
} from "../core/wardrobe/wardrobeRules";
import { getCornerCabinetConfig, buildCornerDoorLayerItems } from "../core/cornerCabinet";
import {
  buildCaixaFornoDoorsLayer,
  isCaixaFornoBox,
  syncCaixaFornoOnDimensoesChange,
} from "../core/moveis/generators/caixaFornoGenerator";
import {
  backupLayerMaterials,
  restoreLayerMaterials,
} from "../core/viewer/materialPreservation";
import { isDrawerModeloAActive } from "../core/drawers/drawerSystemFlags";
import {
  defaultEuropeanDrawerConfig,
  generateEuropeanDrawer,
  europeanResultToLayerItems,
} from "../core/drawers/european";

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
    espessuraCostaMm: resolveCostaThicknessMm(box),
    costaAtiva: box.costaAtiva,
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
  // Modelo A desativado: não gera gavetas novas; preserva drawersLayer existente (dados intactos).
  const modeloAActive = isDrawerModeloAActive();
  const hasDrawers = modeloAActive && drawerCount > 0;

  if (isCaixaFornoBox(box)) {
    const synced = syncCaixaFornoOnDimensoesChange(box);
    const doorsLayer = buildCaixaFornoDoorsLayer(synced, synced.doorsLayer);
    const generated = { doorsLayer, drawersLayer: [] as DrawerLayerItem[] };
    if (materialBackup) {
      return restoreLayerMaterials(generated, materialBackup);
    }
    return generated;
  }

  const doorsLayer: DoorLayerItem[] = [];
  const drawersLayer: DrawerLayerItem[] = [];

  // PORTAS: criar se portaTipo exigir (mesmo que existam gavetas/prateleiras).
  if (box.portaTipo === "porta_simples" || box.portaTipo === "porta_dupla") {
    const gapVertical = clamp(settings.portas.portaGapVerticalMm, 0);
    const gapHorizontal = clamp(settings.portas.portaGapHorizontalMm, 0);
    const doorGap = clamp(settings.portas.portaGapDuplaMm, 0);

    const cornerCfg = getCornerCabinetConfig(box.baseCabinetId);
    if (cornerCfg && box.portaTipo === "porta_simples") {
      doorsLayer.push(...buildCornerDoorLayerItems(box, box.doorsLayer));
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
  // - Modelo A activo: pipeline clássico
  // - Modelo A off: Sistema Europeu (Modelo B) substitui o pipeline
  if (!modeloAActive) {
    const euCount = Math.max(0, Math.floor(box.gavetas || 0));
    if (euCount > 0) {
      const systemId = box.europeanDrawerConfig?.systemId ?? "blum-legrabox";
      const euConfig = {
        ...defaultEuropeanDrawerConfig(
          {
            id: box.id,
            nome: box.nome,
            dimensoes: box.dimensoes,
            espessura: thickness,
            gavetas: euCount,
            material: box.material,
            europeanDrawerConfig: box.europeanDrawerConfig,
          },
          systemId
        ),
        ...box.europeanDrawerConfig,
        count: euCount,
        systemId,
      };
      const result = generateEuropeanDrawer(systemId, {
        id: box.id,
        nome: box.nome,
        dimensoes: box.dimensoes,
        espessura: thickness,
        gavetas: euCount,
        material: box.material,
        europeanDrawerConfig: euConfig,
        profundidadeInternaUtilMm: getProfundidadeInternaUtilMm(
          box,
          resolveCostaThicknessMm(box)
        ),
        espessuraCosta: resolveCostaThicknessMm(box),
        costaAtiva: box.costaAtiva,
      });
      // Validacao industrial: nao renderizar layers se gaveta invalida
      if (result.valid) {
        drawersLayer.push(
          ...europeanResultToLayerItems(result, box.id, {
            material: box.material,
            frontMaterial: euConfig.frontMaterialId ?? box.material,
          })
        );
        for (let i = 0; i < drawersLayer.length; i++) {
          const existing =
            (box.drawersLayer ?? []).find((d) => d.metadata?.modeloB && d.id === drawersLayer[i]!.id) ??
            (box.drawersLayer ?? [])[i];
          if (existing) {
            const frontMat =
              existing.materialId ??
              existing.metadata?.frontMaterial ??
              existing.material ??
              drawersLayer[i]!.materialId;
            drawersLayer[i] = {
              ...drawersLayer[i]!,
              isOpen: existing.isOpen ?? false,
              // Material da frente independente — não reconstrói o corpo
              materialId: frontMat,
              material: frontMat,
              metadata: {
                ...drawersLayer[i]!.metadata,
                ...existing.metadata,
                modeloB: true,
                frontMaterial: frontMat,
                europeanSystemId: systemId,
              },
            };
          }
        }
      }
    }
  } else if (hasDrawers) {
    const drawerSettings = settings.gavetas;
    const drawerType = box.drawerType ?? "normal";
    const mode = box.drawerHeightMode ?? drawerSettings.gavetaAlturaModoPadrao;
    const espessuraCostaMm = resolveCostaThicknessMm(box);
    const costaAtiva = box.costaAtiva;
    const customHeights =
      mode === "custom"
        ? (box.drawersLayer ?? []).map((item) => item.bodyHeight ?? item.height)
        : undefined;

    // Usar o domínio de drawers para gerar gavetas
    const isWardrobe = isWardrobeModel(box.baseCabinetId);
    const wardrobeGroup = getWardrobeGroupFromBaseCabinetId(box.baseCabinetId);
    const shouldWardrobeLowerRightDrawers =
      isWardrobe && wardrobeGroup !== "T" && hasWardrobeLowerDrawers(box.baseCabinetId) && boxWidth >= 1200;

    const feetHeightMm = Math.max(40, box.feetHeight ?? (box.pe_cm ?? 10) * 10);
    const drawerOverrides = buildDrawerParametricOverridesList(box.drawersLayer, drawerCount);
    const ergonomicsRules = isErgonomicDrawerHeightMode(mode)
      ? resolveDrawerErgonomicsRules()
      : undefined;

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
          ergonomicsRules,
          minDrawerHeightMm: drawerSettings.gavetaAlturaMinimaMm,
          maxDrawerHeightMm: drawerSettings.gavetaAlturaMaximaMm,
          espessuraCostaMm,
          costaAtiva,
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
        espessuraCostaMm,
        costaAtiva,
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
          metadata: {
            ...generatedDrawers[i].metadata,
            ...existing.metadata,
          },
        };
        const frontOverride = existing.metadata?.frontHeightMm;
        if (frontOverride != null && Number.isFinite(frontOverride) && frontOverride > 0) {
          generatedDrawers[i].height = frontOverride;
        }
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
  if (!isDrawerModeloAActive()) {
    // Stub seguro: Modelo A desativado — não cria gaveta real (ação deve ser no-op antes).
    return {
      id: createId("drawer-inactive"),
      parentBoxId: box.id,
      width: 0,
      height: 0,
      depth: 0,
      frontThickness: 0,
      posX: 0,
      posY: 0,
      posZ: 0,
      rotY: 0,
      isOpen: false,
      openDirection: "pull",
      pullDistanceMm: 0,
      material: defaultDrawerMaterial,
      materialId: defaultDrawerMaterial,
    };
  }

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
