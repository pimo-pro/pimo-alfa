/**
 * Conversão bidirecional entre coordenadas de furo (mm) e posição local do mesh (m).
 * Alinhado com ViewerPanelVisibility.createContourEdgesGeometry.
 */

const PANEL_THICKNESS_M = 0.019;
const OVERLAY_INSET_M = 0.00015;

export type HoleLocalMeters = { x: number; y: number; z: number };

export function holeMmToLocalMeters(
  panelType: string,
  widthM: number,
  heightM: number,
  xMm: number,
  yMm: number
): HoleLocalMeters {
  const t = PANEL_THICKNESS_M;
  const panelW = widthM;
  const panelH = heightM;

  if (panelType === "top") {
    const y0 = -t / 2 - OVERLAY_INSET_M;
    return {
      x: xMm / 1000 - panelW / 2,
      y: y0,
      z: panelH / 2 - yMm / 1000,
    };
  }

  if (panelType === "bottom") {
    const y0 = t / 2 + OVERLAY_INSET_M;
    return {
      x: xMm / 1000 - panelW / 2,
      y: y0,
      z: panelH / 2 - yMm / 1000,
    };
  }

  if (panelType === "left" || panelType === "right") {
    const sideH = Math.max(0.001, heightM - 2 * t);
    const x0 = t / 2 + OVERLAY_INSET_M;
    return {
      x: x0,
      y: sideH / 2 - yMm / 1000,
      z: xMm / 1000 - panelW / 2,
    };
  }

  if (panelType === "back") {
    const z0 = PANEL_THICKNESS_M / 2 + OVERLAY_INSET_M;
    return {
      x: xMm / 1000 - panelW / 2,
      y: heightM / 2 - yMm / 1000,
      z: z0,
    };
  }

  // front / prateleira / fallback horizontal
  const y0 = -t / 2 - OVERLAY_INSET_M;
  return {
    x: xMm / 1000 - panelW / 2,
    y: y0,
    z: panelH / 2 - yMm / 1000,
  };
}

export function localMetersToHoleMm(
  panelType: string,
  widthM: number,
  heightM: number,
  local: HoleLocalMeters
): { xMm: number; yMm: number } {
  const t = PANEL_THICKNESS_M;
  const panelW = widthM;
  const panelH = heightM;

  if (panelType === "top" || panelType === "bottom") {
    return {
      xMm: (local.x + panelW / 2) * 1000,
      yMm: (panelH / 2 - local.z) * 1000,
    };
  }

  if (panelType === "left" || panelType === "right") {
    const sideH = Math.max(0.001, heightM - 2 * t);
    return {
      xMm: (local.z + panelW / 2) * 1000,
      yMm: (sideH / 2 - local.y) * 1000,
    };
  }

  if (panelType === "back" || panelType === "front") {
    return {
      xMm: (local.x + panelW / 2) * 1000,
      yMm: (heightM / 2 - local.y) * 1000,
    };
  }

  return {
    xMm: (local.x + panelW / 2) * 1000,
    yMm: (panelH / 2 - local.z) * 1000,
  };
}
