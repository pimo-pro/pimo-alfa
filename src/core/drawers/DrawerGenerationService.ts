/**
 * DrawerGenerationService
 * 
 * Serviço responsável por gerar gavetas automaticamente
 * baseado nas dimensões do box e configurações.
 */

import { devLogger } from "../../utils/devLogger";
import {
  calculateDrawerSpecs,
  validateDrawerSpecs,
  type DrawerDimensions,
  type DrawerParametricOverrides,
  type DrawerParametricSettings,
} from "./DrawerParametrics";
import { createDrawer, type Drawer } from "./Drawer";
import {
  calculateDrawerHeights,
  calculateDrawerPositions,
  type DrawerGroup,
} from "./DrawerGroup";
import type { DrawerHeightMode } from "./drawerHeightModeTypes";
import type { ErgonomicHeightRules, KitchenZoneProfile } from "./drawerErgonomicsHeights";
import { DRAWER_VERTICAL_BASE_OFFSET_MM } from "./drawerVerticalPosition";

export interface DrawerGenerationConfig {
  // Box dimensions
  boxWidth: number;
  boxHeight: number;
  boxDepth: number;
  boxThickness: number;
  boxId: string;

  // Drawer config
  drawerCount: number;
  drawerType: "normal" | "pro";
  heightMode: DrawerHeightMode;
  customHeights?: number[];
  ergonomicsRules?: ErgonomicHeightRules;
  kitchenZoneProfile?: KitchenZoneProfile;
  minDrawerHeightMm?: number;
  maxDrawerHeightMm?: number;
  
  // Available depths (from settings)
  availableDepths: number[];
  drawerSettings?: Partial<DrawerParametricSettings>;
  
  // Material
  materialId?: string;

  /** Overrides UI por gaveta (metadata drawersLayer → geometria). */
  drawerOverrides?: Array<DrawerParametricOverrides | undefined>;

  /**
   * Deslocamento do “origin” do conjunto de gavetas no sistema local do box (mm).
   * Permite gerar gavetas apenas numa sub-região (ex.: lado direito de um divisor).
   */
  originX?: number;
  originY?: number;
}

/**
 * Gera um grupo completo de gavetas para um box
 * REESCRITO: Distribuição proporcional e posicionamento correto
 */
export function generateDrawerGroup(config: DrawerGenerationConfig): DrawerGroup {
  const {
    boxWidth,
    boxHeight,
    boxDepth,
    boxThickness,
    boxId,
    drawerCount,
    drawerType,
    heightMode,
    customHeights,
    availableDepths,
    drawerSettings,
    materialId,
    originX,
    originY,
    drawerOverrides,
    ergonomicsRules,
    kitchenZoneProfile,
    minDrawerHeightMm,
    maxDrawerHeightMm,
  } = config;

  // Dimensões internas do box
  const boxInternalWidth = boxWidth - 2 * boxThickness;
  const boxInternalHeight = boxHeight;
  const boxInternalDepth = boxDepth;

  // Calcula alturas das gavetas (distribuição proporcional)
  // Regra: altura corpo = (boxHeight / N) - 6mm
  const heights = calculateDrawerHeights(
    drawerCount,
    boxHeight,
    heightMode,
    customHeights,
    {
      ergonomicsRules,
      kitchenZoneProfile,
      minHeightMm: minDrawerHeightMm ?? drawerSettings?.gavetaAlturaMinimaMm,
      maxHeightMm: maxDrawerHeightMm ?? drawerSettings?.gavetaAlturaMaximaMm,
    }
  );

  // Calcula posições Y (empilhamento vertical)
  const positions = calculateDrawerPositions(heights, boxHeight, DRAWER_VERTICAL_BASE_OFFSET_MM);

  // Gera cada gaveta
  const drawers: Drawer[] = [];
  for (let i = 0; i < drawerCount; i++) {
    const drawerHeight = heights[i];
    const posY = positions[i];
    const perDrawerOverrides = drawerOverrides?.[i];
    const effectiveDrawerType = perDrawerOverrides?.drawerType ?? drawerType;

    // Calcula specs da gaveta (com número total para cálculos proporcionais)
    const dims: DrawerDimensions = {
      boxInternalWidth,
      boxExternalWidth: boxWidth,
      boxInternalHeight,
      boxInternalDepth,
      boxThickness,
      drawerHeight,
      totalDrawers: drawerCount,
      type: effectiveDrawerType,
    };

    const specs = calculateDrawerSpecs(dims, availableDepths, drawerSettings, perDrawerOverrides);

    // Valida specs
    if (!validateDrawerSpecs(specs)) {
      devLogger.warn(`DrawerGenerationService: specs inválidas para gaveta ${i}`);
    }

    // Posicao Z: frente flush com a face frontal do módulo (origem local no centro da caixa).
    const drawer = createDrawer(
      `drawer-${boxId}-${i}`,
      boxId,
      specs,
      {
        x: originX ?? 0,
        y: (originY ?? 0) + posY,
        z: boxDepth / 2 - specs.front.thickness / 2,
      },
      effectiveDrawerType
    );

    if (materialId) {
      drawer.materialId = materialId;
    }

    drawers.push(drawer);
  }

  // Retorna grupo
  return {
    id: `drawer-group-${boxId}`,
    parentBoxId: boxId,
    drawers,
    heightMode,
    customHeights,
    boxDimensions: {
      width: boxWidth,
      height: boxHeight,
      depth: boxDepth,
      thickness: boxThickness,
    },
  };
}

/**
 * Regenera gavetas existentes com novos parâmetros
 */
export function regenerateDrawerGroup(
  existingGroup: DrawerGroup,
  config: Partial<DrawerGenerationConfig>
): DrawerGroup {
  const fullConfig: DrawerGenerationConfig = {
    boxWidth: config.boxWidth ?? existingGroup.boxDimensions.width,
    boxHeight: config.boxHeight ?? existingGroup.boxDimensions.height,
    boxDepth: config.boxDepth ?? existingGroup.boxDimensions.depth,
    boxThickness: config.boxThickness ?? existingGroup.boxDimensions.thickness,
    boxId: existingGroup.parentBoxId,
    drawerCount: config.drawerCount ?? existingGroup.drawers.length,
    drawerType: config.drawerType ?? existingGroup.drawers[0]?.type ?? "normal",
    heightMode: config.heightMode ?? existingGroup.heightMode,
    customHeights: config.customHeights ?? existingGroup.customHeights,
    availableDepths: config.availableDepths ?? [250, 300, 350, 400, 450, 500, 550, 600],
    drawerSettings: config.drawerSettings,
    materialId: config.materialId ?? existingGroup.drawers[0]?.materialId,
    drawerOverrides: config.drawerOverrides,
    ergonomicsRules: config.ergonomicsRules,
    kitchenZoneProfile: config.kitchenZoneProfile,
    minDrawerHeightMm: config.minDrawerHeightMm,
    maxDrawerHeightMm: config.maxDrawerHeightMm,
  };

  return generateDrawerGroup(fullConfig);
}

/**
 * Valida se um box pode ter gavetas
 */
export function canBoxHaveDrawers(
  boxWidth: number,
  boxHeight: number,
  boxDepth: number,
  drawerCount: number
): { valid: boolean; reason?: string } {
  if (drawerCount <= 0) {
    return { valid: false, reason: "Número de gavetas deve ser maior que zero" };
  }

  const minDrawerHeight = 50;
  const availableHeight = Math.max(0, boxHeight - 10);
  const heightPerDrawer = availableHeight / drawerCount;

  if (heightPerDrawer < minDrawerHeight) {
    return {
      valid: false,
      reason: `Altura insuficiente: ${heightPerDrawer.toFixed(0)}mm por gaveta (mínimo ${minDrawerHeight}mm)`,
    };
  }

  const minBoxWidth = 100;
  if (boxWidth < minBoxWidth) {
    return {
      valid: false,
      reason: `Largura insuficiente: ${boxWidth}mm (mínimo ${minBoxWidth}mm)`,
    };
  }

  const minBoxDepth = 100;
  if (boxDepth < minBoxDepth) {
    return {
      valid: false,
      reason: `Profundidade insuficiente: ${boxDepth}mm (mínimo ${minBoxDepth}mm)`,
    };
  }

  return { valid: true };
}
