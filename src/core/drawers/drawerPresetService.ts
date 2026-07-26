/**
 * Extração e aplicação de presets de gavetas por caixote.
 */

import type { WorkspaceBox } from "../types";
import type { DrawerLayerItem } from "../../models/BoxLayers";
import { canBoxHaveDrawers } from "./index";
import { regenerateLayersForBox } from "../../services/boxLayersService";
import { validateBoxDrawerConfiguration } from "./drawerUiValidation";
import { getSettings } from "../settings/settingsService";
import type { DrawerPreset, DrawerPresetDrawerConfig } from "./drawerPresetTypes";
import { slugDrawerPresetId } from "./drawerPresets";
import { resolveDrawerFrontHeightMm } from "./drawerLayerCustomization";
import { isDrawerModeloAActive } from "./drawerSystemFlags";

export function drawerConfigFromLayerItem(item: DrawerLayerItem): DrawerPresetDrawerConfig {
  const metadata = item.metadata ? { ...item.metadata } : undefined;
  return {
    type: item.type ?? item.drawerType,
    drawerType: item.drawerType ?? item.type,
    slideType: item.slideType ?? metadata?.slideType,
    metalBoxType: item.metalBoxType ?? metadata?.metalBoxType,
    softClose: item.softClose ?? metadata?.softClose,
    handleType: item.handleType ?? metadata?.handleType,
    handlePosition: item.handlePosition ?? metadata?.handlePosition,
    handleOffsetMm: item.handleOffsetMm ?? metadata?.handleOffsetMm,
    handleProfileId: item.metadata?.handleProfileId,
    handleCenterDistanceMm: item.metadata?.handleCenterDistanceMm,
    handleOffsetXMm: item.metadata?.handleOffsetXMm,
    handleOffsetYMm: item.metadata?.handleOffsetYMm,
    handlePositionPercent: item.metadata?.handlePositionPercent,
    material: item.material,
    materialId: item.materialId,
    allowPieceRotation: item.allowPieceRotation,
    bodyHeight: item.bodyHeight ?? item.height,
    metadata,
  };
}

export function mergeDrawerPresetDrawerConfigOntoLayer(
  layer: DrawerLayerItem,
  config: DrawerPresetDrawerConfig
): DrawerLayerItem {
  const metadata: DrawerLayerItem["metadata"] = {
    ...layer.metadata,
    ...config.metadata,
  };

  const drawerType = config.drawerType ?? config.type ?? layer.drawerType ?? layer.type;
  const slideType = config.slideType ?? metadata?.slideType ?? layer.slideType;
  const metalBoxType = config.metalBoxType ?? metadata?.metalBoxType ?? layer.metalBoxType;
  const softClose = config.softClose ?? metadata?.softClose ?? layer.softClose;
  const handleType = config.handleType ?? metadata?.handleType ?? layer.handleType;
  const handlePosition = config.handlePosition ?? metadata?.handlePosition ?? layer.handlePosition;
  const handleOffsetMm = config.handleOffsetMm ?? metadata?.handleOffsetMm ?? layer.handleOffsetMm;

  if (slideType) metadata.slideType = slideType;
  if (metalBoxType) metadata.metalBoxType = metalBoxType;
  if (typeof softClose === "boolean") metadata.softClose = softClose;
  if (handleType) metadata.handleType = handleType;
  if (handlePosition) metadata.handlePosition = handlePosition;
  if (handleOffsetMm != null) metadata.handleOffsetMm = handleOffsetMm;
  if (config.handleProfileId) metadata.handleProfileId = config.handleProfileId;
  if (config.handleCenterDistanceMm != null) metadata.handleCenterDistanceMm = config.handleCenterDistanceMm;
  if (config.handleOffsetXMm != null) metadata.handleOffsetXMm = config.handleOffsetXMm;
  if (config.handleOffsetYMm != null) metadata.handleOffsetYMm = config.handleOffsetYMm;
  if (config.handlePositionPercent != null) metadata.handlePositionPercent = config.handlePositionPercent;
  if (drawerType) metadata.drawerType = drawerType;

  const bodyHeight =
    config.bodyHeight != null && config.bodyHeight > 0
      ? config.bodyHeight
      : layer.bodyHeight ?? layer.height;

  const merged: DrawerLayerItem = {
    ...layer,
    type: drawerType ?? layer.type,
    drawerType: drawerType ?? layer.drawerType,
    slideType,
    metalBoxType,
    softClose,
    handleType,
    handlePosition,
    handleOffsetMm,
    material: config.material ?? layer.material,
    materialId: config.materialId ?? layer.materialId,
    allowPieceRotation: config.allowPieceRotation ?? layer.allowPieceRotation,
    bodyHeight,
    metadata,
  };

  const frontHeight = resolveDrawerFrontHeightMm(merged);
  merged.height = frontHeight;
  return merged;
}

export function extractDrawerPresetFromBox(box: WorkspaceBox, nome: string): DrawerPreset | null {
  const drawers = box.drawersLayer ?? [];
  if (drawers.length === 0) return null;

  const trimmed = nome.trim();
  if (!trimmed) return null;

  return {
    id: `${slugDrawerPresetId(trimmed)}_${Date.now().toString(36)}`,
    nome: trimmed,
    drawerCount: box.gavetas ?? drawers.length,
    drawerHeightMode: box.drawerHeightMode ?? "equal",
    drawerType: box.drawerType,
    drawers: drawers.map(drawerConfigFromLayerItem),
  };
}

export type ApplyDrawerPresetResult =
  | { ok: true; box: WorkspaceBox }
  | { ok: false; reason: string };

/**
 * Aplica preset ao caixote: ajusta contagem/modo, regenera camadas e preserva overrides por índice.
 */
export function applyDrawerPresetToBox(
  box: WorkspaceBox,
  preset: DrawerPreset
): ApplyDrawerPresetResult {
  const drawerCount = Math.max(0, Math.floor(preset.drawerCount));
  if (drawerCount === 0) {
    return { ok: false, reason: "O preset não contém gavetas." };
  }

  // Modelo B activo: aplica contagem via europeanDrawerConfig + regenerateLayersForBox (generateEuropeanDrawer).
  if (!isDrawerModeloAActive()) {
    const updatedBase: WorkspaceBox = {
      ...box,
      gavetas: drawerCount,
      drawerConfigError: undefined,
      portaTipo: "sem_porta",
      prateleiras: 0,
      doorsLayer: [],
      europeanDrawerConfig: {
        ...(box.europeanDrawerConfig ?? {
          systemId: "hettich-innotech-atira",
          heightMm: 144,
          depthMm: 450,
          softClose: true,
          pushOpen: false,
        }),
        count: drawerCount,
        softClose: preset.drawers[0]?.softClose ?? box.europeanDrawerConfig?.softClose ?? true,
      },
    };
    const layers = regenerateLayersForBox(updatedBase);
    const updated = { ...updatedBase, ...layers };
    return { ok: true, box: updated };
  }

  const check = canBoxHaveDrawers(
    box.dimensoes.largura,
    box.dimensoes.altura,
    box.dimensoes.profundidade,
    drawerCount
  );
  if (!check.valid) {
    return { ok: false, reason: check.reason ?? "Não é possível aplicar este preset neste módulo." };
  }

  let updated: WorkspaceBox = {
    ...box,
    gavetas: drawerCount,
    drawerHeightMode: preset.drawerHeightMode,
    drawerType: preset.drawerType ?? box.drawerType,
    drawerConfigError: undefined,
    portaTipo: "sem_porta",
    prateleiras: 0,
    doorsLayer: [],
  };

  let layers = regenerateLayersForBox(updated);
  updated = { ...updated, ...layers };

  const patchedDrawers = (updated.drawersLayer ?? []).map((drawer, index) => {
    const config = preset.drawers[index];
    if (!config) return drawer;
    return mergeDrawerPresetDrawerConfigOntoLayer(drawer, config);
  });

  updated = { ...updated, drawersLayer: patchedDrawers };

  layers = regenerateLayersForBox(updated);
  updated = { ...updated, ...layers };

  const drawerConfigWarnings = validateBoxDrawerConfiguration(updated, getSettings().gavetas)
    .filter((alert) => alert.level === "warning")
    .map((alert) => alert.message);

  return {
    ok: true,
    box: { ...updated, drawerConfigWarnings },
  };
}
