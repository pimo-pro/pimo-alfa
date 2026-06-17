import type { WorkspaceBox } from "../types";
import type { SettingsSchema } from "../settings/settingsSchema";
import type { DrawerLayerItem } from "../../models/BoxLayers";
import { canBoxHaveDrawers } from "./DrawerGenerationService";
import { SOFT_CLOSE_COMPATIBLE_SLIDES } from "./drawerUiConstants";

export type DrawerUiAlertLevel = "warning" | "error";

export type DrawerUiAlert = {
  level: DrawerUiAlertLevel;
  message: string;
  drawerId?: string;
};

const CUSTOM_HEIGHT_GAP_MM = 10;

export function getDrawerInternalHeightMm(boxHeightMm: number): number {
  return Math.max(1, boxHeightMm - CUSTOM_HEIGHT_GAP_MM);
}

export function validateBoxDrawerCount(
  box: Pick<WorkspaceBox, "dimensoes">,
  drawerCount: number
): DrawerUiAlert[] {
  if (drawerCount <= 0) return [];
  const check = canBoxHaveDrawers(
    box.dimensoes.largura,
    box.dimensoes.altura,
    box.dimensoes.profundidade,
    drawerCount
  );
  if (check.valid) return [];
  return [{ level: "error", message: check.reason ?? "Configuração de gavetas inválida." }];
}

export function validateCustomDrawerHeights(
  heights: number[],
  boxHeightMm: number,
  settings: SettingsSchema["gavetas"]
): DrawerUiAlert[] {
  const alerts: DrawerUiAlert[] = [];
  const internal = getDrawerInternalHeightMm(boxHeightMm);
  const sum = heights.reduce((acc, h) => acc + (Number.isFinite(h) ? h : 0), 0);
  const tolerance = 2;

  if (Math.abs(sum - internal) > tolerance) {
    alerts.push({
      level: "warning",
      message: `Soma das alturas (${Math.round(sum)} mm) difere da altura interna (${internal} mm).`,
    });
  }

  heights.forEach((height, index) => {
    if (!Number.isFinite(height) || height <= 0) {
      alerts.push({
        level: "error",
        message: `Gaveta ${index + 1}: altura inválida.`,
      });
      return;
    }
    if (height < settings.gavetaAlturaMinimaMm) {
      alerts.push({
        level: "warning",
        message: `Gaveta ${index + 1}: altura abaixo do mínimo (${settings.gavetaAlturaMinimaMm} mm).`,
      });
    }
    if (height > settings.gavetaAlturaMaximaMm) {
      alerts.push({
        level: "warning",
        message: `Gaveta ${index + 1}: altura acima do máximo (${settings.gavetaAlturaMaximaMm} mm).`,
      });
    }
  });

  return alerts;
}

export function validateDrawerLayerItem(
  drawer: DrawerLayerItem,
  box: Pick<WorkspaceBox, "dimensoes">,
  settings: SettingsSchema["gavetas"]
): DrawerUiAlert[] {
  const alerts: DrawerUiAlert[] = [];
  const drawerId = drawer.id;
  const height = drawer.height;
  const slideType = drawer.slideType ?? settings.gavetaTipoCorredica;
  const metalBoxType = drawer.metalBoxType ?? settings.gavetaTipoCaixaMetalica;
  const softClose = drawer.softClose ?? settings.gavetaSoftClose;
  const nominalDepth = drawer.metadata?.nominalDepth ?? drawer.depth;

  if (height < settings.gavetaAlturaMinimaMm) {
    alerts.push({
      level: "warning",
      message: `Altura abaixo do mínimo (${settings.gavetaAlturaMinimaMm} mm).`,
      drawerId,
    });
  }
  if (height > settings.gavetaAlturaMaximaMm) {
    alerts.push({
      level: "warning",
      message: `Altura acima do máximo (${settings.gavetaAlturaMaximaMm} mm).`,
      drawerId,
    });
  }

  if (
    settings.gavetaValidarSoftCloseCompativel &&
    softClose &&
    !SOFT_CLOSE_COMPATIBLE_SLIDES.has(slideType)
  ) {
    alerts.push({
      level: "warning",
      message: `Soft-close pode ser incompatível com ${slideType}.`,
      drawerId,
    });
  }

  if (metalBoxType !== "Nenhuma") {
    if (
      settings.gavetaAlturaCaixaMetalicaMm > 0 &&
      height < settings.gavetaAlturaCaixaMetalicaMm
    ) {
      alerts.push({
        level: "warning",
        message: `Altura insuficiente para caixa metálica (${settings.gavetaAlturaCaixaMetalicaMm} mm).`,
        drawerId,
      });
    }
    const compatibleDepths = settings.gavetaProfundidadesCompativeisMm;
    if (
      settings.gavetaValidarProfundidadeCompativel &&
      nominalDepth > 0 &&
      compatibleDepths.length > 0 &&
      !compatibleDepths.includes(nominalDepth)
    ) {
      alerts.push({
        level: "warning",
        message: `Profundidade ${nominalDepth} mm pode ser incompatível com ${metalBoxType}.`,
        drawerId,
      });
    }
  }

  const availableDepths = settings.gavetaProfundidadesDisponiveisMm;
  if (
    nominalDepth > 0 &&
    availableDepths.length > 0 &&
    !availableDepths.includes(nominalDepth)
  ) {
    alerts.push({
      level: "warning",
      message: `Profundidade ${nominalDepth} mm fora da lista disponível.`,
      drawerId,
    });
  }

  if (box.dimensoes.profundidade < 100) {
    alerts.push({
      level: "error",
      message: "Profundidade do módulo insuficiente para gavetas.",
      drawerId,
    });
  }

  for (const warning of drawer.drawerWarnings ?? []) {
    alerts.push({ level: "warning", message: warning, drawerId });
  }

  return alerts;
}

export function validateBoxDrawerConfiguration(
  box: WorkspaceBox,
  settings: SettingsSchema["gavetas"]
): DrawerUiAlert[] {
  const alerts: DrawerUiAlert[] = [];
  const count = box.gavetas ?? 0;
  if (count <= 0) return alerts;

  alerts.push(...validateBoxDrawerCount(box, count));

  const mode = box.drawerHeightMode ?? settings.gavetaAlturaModoPadrao;
  if (mode === "custom") {
    const heights = (box.drawersLayer ?? []).map((d) => d.height);
    alerts.push(...validateCustomDrawerHeights(heights, box.dimensoes.altura, settings));
  }

  for (const drawer of box.drawersLayer ?? []) {
    alerts.push(...validateDrawerLayerItem(drawer, box, settings));
  }

  return alerts;
}
