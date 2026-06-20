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

/** Altura útil interna do vão de gavetas (mm): altura caixa − pés − folga base. */
export function resolveDrawerUsableInternalHeightMm(
  box: Pick<WorkspaceBox, "dimensoes" | "feetEnabled" | "feetHeight" | "pe_cm">,
  gapMm: number = CUSTOM_HEIGHT_GAP_MM
): number {
  const feetHeightMm =
    box.feetEnabled !== false ? Number(box.feetHeight ?? (box.pe_cm ?? 10) * 10) : 0;
  return Math.max(1, box.dimensoes.altura - feetHeightMm - gapMm);
}

/** Profundidade útil para curso da corrediça (mm): profundidade − recuo traseiro − folga corrediça. */
export function resolveDrawerUsableInternalDepthMm(
  box: Pick<WorkspaceBox, "dimensoes">,
  settings: SettingsSchema["gavetas"]
): number {
  const depth = Number(box.dimensoes.profundidade) || 0;
  const bodyRecess = Number(settings.gavetaRecuoCorpoMm) || 0;
  const runnerClearance = Number(settings.gavetaRecuoProfundidadeCorredicaMm) || 0;
  return Math.max(0, depth - bodyRecess - runnerClearance);
}

export function validateDrawerFeetWarning(
  drawer: DrawerLayerItem,
  box: Pick<WorkspaceBox, "dimensoes" | "feetEnabled" | "feetHeight" | "pe_cm" | "drawersLayer">,
  drawerIndex: number
): DrawerUiAlert[] {
  if (drawerIndex !== 0) return [];
  const feetHeightMm =
    box.feetEnabled !== false ? Number(box.feetHeight ?? (box.pe_cm ?? 10) * 10) : 0;
  if (feetHeightMm <= 0) return [];

  const usableHeight = resolveDrawerUsableInternalHeightMm(box);
  if (feetHeightMm > usableHeight * 0.35 || feetHeightMm > drawer.height * 0.35) {
    return [
      {
        level: "warning",
        message: "Rodapé/pés demasiado altos para a gaveta inferior.",
        drawerId: drawer.id,
      },
    ];
  }
  return [];
}

export function validateDrawerSlideCourseWarning(
  drawer: DrawerLayerItem,
  box: Pick<WorkspaceBox, "dimensoes">,
  settings: SettingsSchema["gavetas"]
): DrawerUiAlert[] {
  const usefulDepth = resolveDrawerUsableInternalDepthMm(box, settings);
  const pullMm =
    Number(drawer.bodyDepth) > 0
      ? Number(drawer.bodyDepth)
      : Math.max(0, (Number(drawer.depth) || 0) - (Number(drawer.frontThickness) || 0));
  if (usefulDepth > 0 && pullMm > usefulDepth) {
    return [
      {
        level: "warning",
        message: "Curso da corrediça excede a profundidade interna do módulo.",
        drawerId: drawer.id,
      },
    ];
  }
  return [];
}

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

export function validateDrawerLayerItemWithIndex(
  drawer: DrawerLayerItem,
  box: WorkspaceBox,
  settings: SettingsSchema["gavetas"],
  drawerIndex: number
): DrawerUiAlert[] {
  return [
    ...validateDrawerLayerItem(drawer, box, settings),
    ...validateDrawerFeetWarning(drawer, box, drawerIndex),
    ...validateDrawerSlideCourseWarning(drawer, box, settings),
  ];
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

  for (let index = 0; index < (box.drawersLayer ?? []).length; index++) {
    const drawer = box.drawersLayer![index]!;
    alerts.push(...validateDrawerLayerItemWithIndex(drawer, box, settings, index));
  }

  return alerts;
}
