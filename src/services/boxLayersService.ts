import type { WorkspaceBox } from "../core/types";
import { getSettings } from "../core/settings/settingsService";
import type { DoorLayerItem, DrawerLayerItem } from "../models/BoxLayers";

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
const DRAWER_BASE_OFFSET_MM = 10;
const DRAWER_BACK_CLEARANCE_MM = 10;

const resolveDrawerDepth = (boxDepth: number, frontThickness: number, availableDepths: number[]) => {
  const maxDepth = Math.max(MM_EPS, boxDepth - DRAWER_BACK_CLEARANCE_MM - frontThickness);
  const sorted = [...availableDepths].filter((d) => d > 0).sort((a, b) => a - b);
  const candidate = sorted.filter((d) => d <= maxDepth).pop();
  return candidate ?? Math.max(MM_EPS, Math.min(maxDepth, sorted[0] ?? maxDepth));
};

export const applyDrawerTypeRules = (
  box: WorkspaceBox,
  drawer: DrawerLayerItem,
  settings = getSettings()
): DrawerLayerItem => {
  const thickness = clamp(box.espessura, 18);
  const drawerSettings = settings.gavetas;
  const resolvedType = drawer.type ?? drawer.drawerType ?? box.drawerType ?? "normal";
  const sideGap = clamp(drawerSettings.gavetaFolgaLateralMm, 0);
  const frontThickness = thickness;
  const baseThickness =
    resolvedType === "pro" && drawerSettings.gavetaProBaseEspessuraMm > 0
      ? drawerSettings.gavetaProBaseEspessuraMm
      : resolvedType === "pro"
        ? thickness
        : clamp(drawerSettings.gavetaNormalBaseEspessuraMm, 0);
  const sideMaterial: "wood" | "aluminum" = resolvedType === "pro" ? "aluminum" : "wood";
  const sideThickness = resolvedType === "pro" ? 0 : thickness;
  const backThickness = thickness;
  const drawerWidth = clamp(box.dimensoes.largura - (2 * thickness) - (2 * sideGap), MM_EPS);
  const depth = resolveDrawerDepth(
    box.dimensoes.profundidade,
    frontThickness,
    drawerSettings.gavetaProfundidadesDisponiveisMm
  );
  // Position drawer front at the box surface: 
  // Box front is at +boxDepth/2. The front panel's front face should be at that position.
  // Since front panel is centered at group.z with thickness/2 extending outward, group.z = boxDepth/2 - frontThickness/2
  const posZ = box.dimensoes.profundidade / 2 - frontThickness / 2;
  const pullDistanceMm = Math.max(0, depth - frontThickness);

  return {
    ...drawer,
    type: resolvedType,
    sideMaterial,
    bottomThickness: baseThickness,
    sideThickness,
    backThickness,
    width: drawerWidth,
    depth,
    frontThickness,
    posZ,
    pullDistanceMm,
  };
};

const resolveDrawerHeights = (
  count: number,
  totalHeight: number,
  mode: "equal" | "top_small_mid_medium_bottom_large" | "custom",
  customHeights?: number[]
) => {
  if (count <= 0) return [] as number[];
  if (mode === "custom" && customHeights && customHeights.length > 0) {
    const heights = Array.from({ length: count }, (_, index) => {
      const value = customHeights[index];
      return Number.isFinite(value) && value > 0 ? value : totalHeight / count;
    });
    return heights;
  }
  if (mode === "equal" || count === 1) {
    const each = totalHeight / count;
    return Array.from({ length: count }, () => each);
  }

  if (count === 2) {
    const top = totalHeight * 0.4;
    const bottom = totalHeight - top;
    return [top, bottom];
  }

  const topWeight = 0.2;
  const bottomWeight = 0.4;
  const middleWeight = 1 - topWeight - bottomWeight;
  const middleCount = count - 2;
  const middleEach = middleWeight / middleCount;
  const weights = [topWeight, ...Array.from({ length: middleCount }, () => middleEach), bottomWeight];
  const heights = weights.map((w) => w * totalHeight);
  const sum = heights.reduce((acc, value) => acc + value, 0);
  const diff = totalHeight - sum;
  heights[heights.length - 1] += diff;
  return heights;
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
    const sideGap = clamp(drawerSettings.gavetaFolgaLateralMm, 0);
    const frontThickness = thickness;
    const baseThickness =
      drawerType === "pro" && drawerSettings.gavetaProBaseEspessuraMm > 0
        ? drawerSettings.gavetaProBaseEspessuraMm
        : drawerType === "pro"
          ? thickness
          : clamp(drawerSettings.gavetaNormalBaseEspessuraMm, 0);
    const sideMaterial = drawerType === "pro" ? "aluminum" : "wood";
    const sideThickness = drawerType === "pro" ? 0 : thickness;
    const backThickness = thickness;
    const drawerWidth = clamp(boxWidth - (2 * thickness) - (2 * sideGap), MM_EPS);
    const availableHeight = Math.max(MM_EPS, boxHeight - DRAWER_BASE_OFFSET_MM);
    const mode = box.drawerHeightMode ?? drawerSettings.gavetaAlturaModoPadrao;
    const customHeights = mode === "custom" ? (box.drawersLayer ?? []).map((item) => item.height) : undefined;
    const heights = resolveDrawerHeights(drawerCount, availableHeight, mode, customHeights);
    const depth = resolveDrawerDepth(
      boxDepth,
      frontThickness,
      drawerSettings.gavetaProfundidadesDisponiveisMm
    );
    let offsetY = 0;
    for (let i = 0; i < drawerCount; i += 1) {
      const drawerHeight = heights[i] ?? availableHeight / drawerCount;
      const posY = -boxHeight / 2 + DRAWER_BASE_OFFSET_MM + offsetY + drawerHeight / 2;
      const existing = (box.drawersLayer ?? [])[i];
      const drawerTypeResolved = existing?.type ?? existing?.drawerType ?? drawerType;
      const isOpen = existing?.isOpen ?? false;
      const materialId = existing?.materialId ?? defaultDrawerMaterial;
      const pullDistanceMm = existing?.pullDistanceMm ?? Math.max(0, depth - frontThickness);
      const resolved = applyDrawerTypeRules(box, {
        id: createId("drawer"),
        parentBoxId: box.id,
        type: drawerTypeResolved,
        drawerType: drawerTypeResolved,
        sideMaterial,
        bottomThickness: baseThickness,
        sideThickness,
        backThickness,
        width: drawerWidth,
        height: drawerHeight,
        depth,
        frontThickness,
        materialId,
        openDirection: "pull",
        isOpen,
        pullDistanceMm,
        posX: 0,
        posY,
        posZ: 0,
        rotY: 0,
      });
      drawersLayer.push(resolved);
      offsetY += drawerHeight;
    }
  }

  for (const door of doorsLayer) {
    console.log("door", {
      posX: door.posX,
      posY: door.posY,
      posZ: door.posZ,
      width: door.width,
      height: door.height,
      depth: door.thickness,
    });
  }

  for (const drawer of drawersLayer) {
    console.log("drawer", {
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
  const sideGap = clamp(drawerSettings.gavetaFolgaLateralMm, 0);
  const frontThickness = thickness;
  const baseThickness =
    drawerType === "pro" && drawerSettings.gavetaProBaseEspessuraMm > 0
      ? drawerSettings.gavetaProBaseEspessuraMm
      : drawerType === "pro"
        ? thickness
        : clamp(drawerSettings.gavetaNormalBaseEspessuraMm, 0);
  const sideMaterial: "wood" | "aluminum" = drawerType === "pro" ? "aluminum" : "wood";
  const sideThickness = drawerType === "pro" ? 0 : thickness;
  const backThickness = thickness;
  const availableHeight = Math.max(MM_EPS, box.dimensoes.altura - DRAWER_BASE_OFFSET_MM);
  const mode = box.drawerHeightMode ?? drawerSettings.gavetaAlturaModoPadrao;
  const drawerHeight = resolveDrawerHeights(1, availableHeight, mode)[0] ?? availableHeight;
  const depth = resolveDrawerDepth(
    box.dimensoes.profundidade,
    frontThickness,
    drawerSettings.gavetaProfundidadesDisponiveisMm
  );
  const draft = {
    id: createId("drawer"),
    parentBoxId: box.id,
    type: drawerType,
    sideMaterial,
    bottomThickness: baseThickness,
    sideThickness,
    backThickness,
    width: clamp(box.dimensoes.largura - (2 * thickness) - (2 * sideGap), 80),
    height: drawerHeight,
    depth,
    frontThickness,
    materialId: defaultDrawerMaterial,
    openDirection: "pull",
    isOpen: false,
    pullDistanceMm: Math.max(0, depth - frontThickness),
    posX: 0,
    posY: -box.dimensoes.altura / 2 + DRAWER_BASE_OFFSET_MM + drawerHeight / 2,
    posZ: 0,
    rotY: 0,
  } as DrawerLayerItem;
  return applyDrawerTypeRules(box, draft);
}
