/**
 * Validação geométrica industrial — AABB, contenção na cavidade, interpenetração e furos.
 */

import { getHoleTypeById } from "../drill/holeCatalog";
import type { HoleTypeId } from "../drill/holeCatalog";
import { isInternalLateral, isLeftLateral } from "./cavilhaPairing";
import { findDesignPanel, getInnerDimensions } from "./designModel";
import type { DesignDrillHole, DesignPanel, IndustrialDesignBox } from "./types";

export type DesignValidationSeverity = "warning" | "error";

export type DesignValidationCode =
  | "PANEL_EXCEEDS_INNER_WIDTH"
  | "PANEL_EXCEEDS_INNER_HEIGHT"
  | "PANEL_EXCEEDS_INNER_DEPTH"
  | "PANEL_INTERPENETRATION"
  | "PANEL_OUTSIDE_CAVITY"
  | "HOLE_OUT_OF_BOUNDS"
  | "HOLE_COLLISION";

export type DesignValidationIssue = {
  code: DesignValidationCode;
  severity: DesignValidationSeverity;
  message: string;
  panelId?: string;
  relatedPanelId?: string;
  holeId?: string;
};

export class DesignValidationError extends Error {
  readonly issues: DesignValidationIssue[];

  constructor(issues: DesignValidationIssue[]) {
    const first = issues[0]?.message ?? "Validação geométrica falhou.";
    super(first);
    this.name = "DesignValidationError";
    this.issues = issues;
  }
}

export type Vec3Mm = { x: number; y: number; z: number };

export type PanelAabb = {
  panelId: string;
  min: Vec3Mm;
  max: Vec3Mm;
};

const INTERNAL_PANEL_TIPOS = new Set<DesignPanel["tipo"]>([
  "prateleira",
  "divisoria",
  "gaveta_lat_esq",
  "gaveta_lat_dir",
  "gaveta_fundo",
  "gaveta_frente_ext",
  "gaveta_frente_int",
  "gaveta_traseira",
]);

export function isInternalDesignPanel(panel: DesignPanel): boolean {
  return INTERNAL_PANEL_TIPOS.has(panel.tipo);
}

function resolveBackThicknessMm(box: IndustrialDesignBox): number {
  const costa = box.panels.find((p) => p.tipo === "costa");
  return costa?.thicknessMm ?? 10;
}

/** Cavidade útil interior (entre laterais, cima/fundo e costa). */
export function computeInnerCavityAabb(box: IndustrialDesignBox): PanelAabb {
  const e = box.espessuraMm;
  const backT = resolveBackThicknessMm(box);
  return {
    panelId: "__cavity__",
    min: { x: e, y: e, z: backT },
    max: {
      x: box.outerWidthMm - e,
      y: box.outerHeightMm - e,
      z: box.outerDepthMm,
    },
  };
}

function defaultInternalPosition(box: IndustrialDesignBox, panel: DesignPanel): Vec3Mm {
  const cavity = computeInnerCavityAabb(box);
  if (panel.tipo === "prateleira") {
    return { x: cavity.min.x, y: cavity.min.y, z: cavity.min.z };
  }
  if (panel.tipo === "divisoria") {
    const midX = (cavity.min.x + cavity.max.x) / 2 - panel.thicknessMm / 2;
    return { x: midX, y: cavity.min.y, z: cavity.min.z };
  }
  return { ...cavity.min };
}

/** AABB em mm no referencial da caixa (origem no canto inferior-esquerdo-frente exterior). */
export function computePanelAabb(box: IndustrialDesignBox, panel: DesignPanel): PanelAabb {
  const e = box.espessuraMm;
  const W = box.outerWidthMm;
  const H = box.outerHeightMm;
  const D = box.outerDepthMm;
  const backT = resolveBackThicknessMm(box);

  if (panel.tipo === "cima") {
    return {
      panelId: panel.id,
      min: { x: 0, y: H - e, z: 0 },
      max: { x: W, y: H, z: D },
    };
  }
  if (panel.tipo === "fundo") {
    return {
      panelId: panel.id,
      min: { x: 0, y: 0, z: 0 },
      max: { x: W, y: e, z: D },
    };
  }
  if (panel.tipo === "lateral") {
    if (isLeftLateral(panel)) {
      return {
        panelId: panel.id,
        min: { x: 0, y: 0, z: 0 },
        max: { x: e, y: H, z: D },
      };
    }
    if (isInternalLateral(panel)) {
      const pos = panel.positionMm ?? { x: e, y: e, z: backT };
      return {
        panelId: panel.id,
        min: { x: pos.x, y: pos.y, z: pos.z },
        max: { x: pos.x + panel.thicknessMm, y: pos.y + panel.heightMm, z: pos.z + panel.widthMm },
      };
    }
    return {
      panelId: panel.id,
      min: { x: W - e, y: 0, z: 0 },
      max: { x: W, y: H, z: D },
    };
  }
  if (panel.tipo === "costa") {
    if (panel.positionMm) {
      const pos = panel.positionMm;
      return {
        panelId: panel.id,
        min: { x: pos.x, y: pos.y, z: pos.z },
        max: {
          x: pos.x + panel.widthMm,
          y: pos.y + panel.heightMm,
          z: pos.z + panel.thicknessMm,
        },
      };
    }
    return {
      panelId: panel.id,
      min: { x: e, y: e, z: 0 },
      max: { x: W - e, y: H - e, z: backT },
    };
  }

  const pos = panel.positionMm ?? defaultInternalPosition(box, panel);

  if (panel.tipo === "prateleira") {
    return {
      panelId: panel.id,
      min: { x: pos.x, y: pos.y, z: pos.z },
      max: {
        x: pos.x + panel.widthMm,
        y: pos.y + panel.thicknessMm,
        z: pos.z + panel.heightMm,
      },
    };
  }

  if (panel.tipo === "divisoria") {
    return {
      panelId: panel.id,
      min: { x: pos.x, y: pos.y, z: pos.z },
      max: {
        x: pos.x + panel.thicknessMm,
        y: pos.y + panel.heightMm,
        z: pos.z + panel.widthMm,
      },
    };
  }

  if (
    panel.tipo === "gaveta_lat_esq" ||
    panel.tipo === "gaveta_lat_dir"
  ) {
    return {
      panelId: panel.id,
      min: { x: pos.x, y: pos.y, z: pos.z },
      max: {
        x: pos.x + panel.thicknessMm,
        y: pos.y + panel.heightMm,
        z: pos.z + panel.widthMm,
      },
    };
  }

  if (panel.tipo === "gaveta_fundo") {
    return {
      panelId: panel.id,
      min: { x: pos.x, y: pos.y, z: pos.z },
      max: {
        x: pos.x + panel.widthMm,
        y: pos.y + panel.thicknessMm,
        z: pos.z + panel.heightMm,
      },
    };
  }

  if (panel.tipo === "gaveta_traseira" || panel.tipo === "gaveta_frente_int") {
    return {
      panelId: panel.id,
      min: { x: pos.x, y: pos.y, z: pos.z },
      max: {
        x: pos.x + panel.widthMm,
        y: pos.y + panel.heightMm,
        z: pos.z + panel.thicknessMm,
      },
    };
  }

  if (panel.tipo === "gaveta_frente_ext") {
    return {
      panelId: panel.id,
      min: { x: pos.x, y: pos.y, z: pos.z },
      max: {
        x: pos.x + panel.widthMm,
        y: pos.y + panel.heightMm,
        z: pos.z + panel.thicknessMm,
      },
    };
  }

  // frente / frente_fixa / outros
  return {
    panelId: panel.id,
    min: { x: pos.x, y: pos.y, z: pos.z },
    max: {
      x: pos.x + panel.widthMm,
      y: pos.y + panel.heightMm,
      z: pos.z + panel.thicknessMm,
    },
  };
}

export function aabbOverlapDepth(
  a: PanelAabb,
  b: PanelAabb,
  axis: "x" | "y" | "z"
): number {
  return Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]);
}

/** True se os AABBs partilham volume (não apenas contacto de face). */
export function aabbHasVolumeOverlap(a: PanelAabb, b: PanelAabb, minDepthMm = 1): boolean {
  const dx = aabbOverlapDepth(a, b, "x");
  const dy = aabbOverlapDepth(a, b, "y");
  const dz = aabbOverlapDepth(a, b, "z");
  return dx > minDepthMm && dy > minDepthMm && dz > minDepthMm;
}

export function isAabbContainedIn(inner: PanelAabb, outer: PanelAabb, toleranceMm = 0.5): boolean {
  return (
    inner.min.x >= outer.min.x - toleranceMm &&
    inner.min.y >= outer.min.y - toleranceMm &&
    inner.min.z >= outer.min.z - toleranceMm &&
    inner.max.x <= outer.max.x + toleranceMm &&
    inner.max.y <= outer.max.y + toleranceMm &&
    inner.max.z <= outer.max.z + toleranceMm
  );
}

export function validateInternalPanelDimensions(
  box: IndustrialDesignBox,
  panel: DesignPanel
): DesignValidationIssue[] {
  if (!isInternalDesignPanel(panel)) return [];

  const inner = getInnerDimensions(box);
  const issues: DesignValidationIssue[] = [];

  if (panel.tipo === "prateleira") {
    if (panel.widthMm > inner.larguraInterna) {
      issues.push({
        code: "PANEL_EXCEEDS_INNER_WIDTH",
        severity: "warning",
        message: "Peça excede o espaço interno da caixa (largura).",
        panelId: panel.id,
      });
    }
    if (panel.heightMm > inner.profundidadeInterna) {
      issues.push({
        code: "PANEL_EXCEEDS_INNER_DEPTH",
        severity: "warning",
        message: "Peça excede o espaço interno da caixa (profundidade).",
        panelId: panel.id,
      });
    }
  }

  if (panel.tipo === "divisoria") {
    if (panel.heightMm > inner.alturaInterna) {
      issues.push({
        code: "PANEL_EXCEEDS_INNER_HEIGHT",
        severity: "warning",
        message: "Peça excede o espaço interno da caixa (altura).",
        panelId: panel.id,
      });
    }
    if (panel.widthMm > inner.profundidadeInterna) {
      issues.push({
        code: "PANEL_EXCEEDS_INNER_DEPTH",
        severity: "warning",
        message: "Peça excede o espaço interno da caixa (profundidade).",
        panelId: panel.id,
      });
    }
  }

  return issues;
}

export function validatePanelCavityContainment(
  box: IndustrialDesignBox,
  panel: DesignPanel
): DesignValidationIssue[] {
  if (!isInternalDesignPanel(panel)) return [];

  const aabb = computePanelAabb(box, panel);
  const cavity = computeInnerCavityAabb(box);

  if (isAabbContainedIn(aabb, cavity)) return [];

  return [
    {
      code: "PANEL_OUTSIDE_CAVITY",
      severity: "error",
      message: "Painel invade zona estrutural ou ultrapassa o espaço interno da caixa.",
      panelId: panel.id,
    },
  ];
}

export function validateInternalPanelInterpenetration(
  box: IndustrialDesignBox
): DesignValidationIssue[] {
  const internal = box.panels.filter(isInternalDesignPanel);
  const issues: DesignValidationIssue[] = [];

  for (let i = 0; i < internal.length; i += 1) {
    for (let j = i + 1; j < internal.length; j += 1) {
      const a = computePanelAabb(box, internal[i]);
      const b = computePanelAabb(box, internal[j]);
      if (aabbHasVolumeOverlap(a, b)) {
        issues.push({
          code: "PANEL_INTERPENETRATION",
          severity: "error",
          message: "Interpenetração entre peças internas.",
          panelId: internal[i].id,
          relatedPanelId: internal[j].id,
        });
      }
    }
  }

  return issues;
}

export function validateInternalVsStructuralInterpenetration(
  box: IndustrialDesignBox
): DesignValidationIssue[] {
  const internal = box.panels.filter(isInternalDesignPanel);
  const structural = box.panels.filter((p) => !isInternalDesignPanel(p));
  const issues: DesignValidationIssue[] = [];

  for (const inner of internal) {
    const innerAabb = computePanelAabb(box, inner);
    const cavity = computeInnerCavityAabb(box);
    if (!isAabbContainedIn(innerAabb, cavity)) {
      const hit = structural.find((struct) => {
        const structAabb = computePanelAabb(box, struct);
        return aabbHasVolumeOverlap(innerAabb, structAabb);
      });
      if (hit) {
        issues.push({
          code: "PANEL_INTERPENETRATION",
          severity: "error",
          message: "Peça interna atravessa painel estrutural.",
          panelId: inner.id,
          relatedPanelId: hit.id,
        });
      }
    }
  }

  return issues;
}

export function validateHolePlacement(
  panel: DesignPanel,
  holeTypeId: HoleTypeId,
  xMm: number,
  yMm: number,
  existingHoles: DesignDrillHole[] = panel.drillHoles
): DesignValidationIssue[] {
  const issues: DesignValidationIssue[] = [];
  const catalog = getHoleTypeById(holeTypeId);
  const radius = catalog.diametroMm / 2;

  if (xMm < 0 || yMm < 0 || xMm > panel.widthMm || yMm > panel.heightMm) {
    issues.push({
      code: "HOLE_OUT_OF_BOUNDS",
      severity: "error",
      message: "Furo fora dos limites da peça.",
      panelId: panel.id,
    });
    return issues;
  }

  if (xMm - radius < 0 || xMm + radius > panel.widthMm || yMm - radius < 0 || yMm + radius > panel.heightMm) {
    issues.push({
      code: "HOLE_OUT_OF_BOUNDS",
      severity: "error",
      message: "Furo demasiado próximo da borda da peça.",
      panelId: panel.id,
    });
  }

  for (const existing of existingHoles) {
    const other = getHoleTypeById(existing.holeTypeId);
    const minDist = (catalog.diametroMm + other.diametroMm) / 2;
    const dist = Math.hypot(xMm - existing.xMm, yMm - existing.yMm);
    if (dist < minDist - 0.5) {
      issues.push({
        code: "HOLE_COLLISION",
        severity: "error",
        message: "Furo colide com furo existente na mesma peça.",
        panelId: panel.id,
        holeId: existing.id,
      });
    }
  }

  return issues;
}

export function validateHoleInsertion(
  box: IndustrialDesignBox,
  panelId: string,
  holeTypeId: HoleTypeId,
  xMm: number,
  yMm: number
): DesignValidationIssue[] {
  const panel = findDesignPanel(box, panelId);
  if (!panel) return [];

  return validateHolePlacement(panel, holeTypeId, xMm, yMm);
}

export function validatePanelState(
  box: IndustrialDesignBox,
  panel: DesignPanel
): DesignValidationIssue[] {
  return [
    ...validateInternalPanelDimensions(box, panel),
    ...validatePanelCavityContainment(box, panel),
  ];
}

export function validateIndustrialDesignBox(box: IndustrialDesignBox): DesignValidationIssue[] {
  const issues: DesignValidationIssue[] = [];

  for (const panel of box.panels) {
    issues.push(...validatePanelState(box, panel));
  }

  issues.push(...validateInternalPanelInterpenetration(box));
  issues.push(...validateInternalVsStructuralInterpenetration(box));

  return issues;
}

export function getBlockingIssues(issues: DesignValidationIssue[]): DesignValidationIssue[] {
  return issues.filter((i) => i.severity === "error");
}

export function assertDesignOperationAllowed(issues: DesignValidationIssue[]): void {
  const blocking = getBlockingIssues(issues);
  if (blocking.length > 0) {
    throw new DesignValidationError(blocking);
  }
}

/** Ajusta dimensões de prateleira/divisória ao espaço interno da caixa. */
export function autoAdjustPanelToInnerSpace(
  box: IndustrialDesignBox,
  panel: DesignPanel
): DesignPanel {
  if (!isInternalDesignPanel(panel)) return panel;

  const inner = getInnerDimensions(box);

  if (panel.tipo === "prateleira") {
    return {
      ...panel,
      widthMm: Math.min(panel.widthMm, inner.larguraInterna),
      heightMm: Math.min(panel.heightMm, inner.profundidadeInterna),
    };
  }

  if (panel.tipo === "divisoria") {
    return {
      ...panel,
      heightMm: Math.min(panel.heightMm, inner.alturaInterna),
      widthMm: Math.min(panel.widthMm, inner.profundidadeInterna),
    };
  }

  return panel;
}

export function collectIssuePanelIds(issues: DesignValidationIssue[]): string[] {
  const ids = new Set<string>();
  for (const issue of issues) {
    if (issue.panelId) ids.add(issue.panelId);
    if (issue.relatedPanelId) ids.add(issue.relatedPanelId);
  }
  return Array.from(ids);
}
