/**
 * plannerModules.ts — Colocação / movimento / colisões de módulos na grelha.
 */

import type { KitchenModuleSpec } from "../kitchen/types";
import {
  clampToGrid,
  snapToGrid,
  type PlannerGrid,
  type PlannerGridConfig,
} from "./plannerGrid";
import {
  suggestedElevationYMm,
  type PlannerPlacementRules,
} from "./plannerPlacement";

export type PlannerPlacedModule = {
  instanceId: string;
  moduleId: string;
  kind: KitchenModuleSpec["kind"];
  name: string;
  industrialCode: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  /** Posição na planta (X ao longo da parede / Y profundidade). */
  xMm: number;
  yMm: number;
  /** Elevação no alçado. */
  elevationYMm: number;
  frontId?: string;
  doorId?: string;
  drawerCount: number;
  doorCount: number;
};

export type PlannerCollision = {
  a: string;
  b: string;
  overlapMm2: number;
};

let _seq = 0;
export function nextPlannerInstanceId(prefix = "mod"): string {
  _seq += 1;
  return `${prefix}-${_seq}-${Date.now().toString(36)}`;
}

export function resetPlannerInstanceSeqForTests(): void {
  _seq = 0;
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): number {
  const xOverlap = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
  const yOverlap = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
  return xOverlap * yOverlap;
}

export function detectCollisions(modules: PlannerPlacedModule[]): PlannerCollision[] {
  const out: PlannerCollision[] = [];
  for (let i = 0; i < modules.length; i++) {
    for (let j = i + 1; j < modules.length; j++) {
      const a = modules[i];
      const b = modules[j];
      // Colisão em planta: X × profundidade (yMm usa depth como ocupação)
      const overlap = rectsOverlap(
        a.xMm,
        a.yMm,
        a.widthMm,
        a.depthMm,
        b.xMm,
        b.yMm,
        b.widthMm,
        b.depthMm
      );
      if (overlap > 0) {
        out.push({ a: a.instanceId, b: b.instanceId, overlapMm2: overlap });
      }
    }
  }
  return out;
}

export function createPlacedModule(
  spec: KitchenModuleSpec,
  position: { xMm: number; yMm: number },
  grid: PlannerGridConfig,
  rules: PlannerPlacementRules,
  options?: { frontId?: string; doorId?: string; instanceId?: string }
): PlannerPlacedModule {
  const pos = clampToGrid(position.xMm, position.yMm, spec.widthMm, spec.depthMm, grid);
  return {
    instanceId: options?.instanceId ?? nextPlannerInstanceId(spec.kind),
    moduleId: spec.id,
    kind: spec.kind,
    name: spec.name,
    industrialCode: spec.metadata.industrialCode,
    widthMm: spec.widthMm,
    heightMm: spec.heightMm,
    depthMm: spec.depthMm,
    xMm: pos.xMm,
    yMm: pos.yMm,
    elevationYMm: suggestedElevationYMm(spec.kind, rules),
    frontId: options?.frontId,
    doorId: options?.doorId,
    drawerCount: spec.metadata.defaultDrawers ?? 0,
    doorCount: spec.metadata.defaultDoors ?? 0,
  };
}

export function movePlacedModule(
  module: PlannerPlacedModule,
  to: { xMm: number; yMm: number },
  grid: PlannerGridConfig
): PlannerPlacedModule {
  const pos = clampToGrid(to.xMm, to.yMm, module.widthMm, module.depthMm, grid);
  return { ...module, xMm: pos.xMm, yMm: pos.yMm };
}

/** Alinha módulos base em fila contínua a partir de x=0. */
export function autoAlignBaseRow(
  modules: PlannerPlacedModule[],
  grid: PlannerGridConfig,
  startXMm = 0,
  rowYMm = 0
): PlannerPlacedModule[] {
  let cursor = snapToGrid(startXMm, grid.snapMm);
  return modules.map((m) => {
    if (m.kind !== "base" && m.kind !== "corner") return m;
    const next = movePlacedModule(m, { xMm: cursor, yMm: rowYMm }, grid);
    cursor += m.widthMm;
    return next;
  });
}

export function findModuleSpec(
  specs: KitchenModuleSpec[],
  moduleId: string
): KitchenModuleSpec | undefined {
  return specs.find((s) => s.id === moduleId);
}

export function addModuleToPlan(
  placed: PlannerPlacedModule[],
  spec: KitchenModuleSpec,
  position: { xMm: number; yMm: number },
  grid: PlannerGrid,
  rules: PlannerPlacementRules,
  options?: { frontId?: string; doorId?: string; allowOverlap?: boolean }
): { modules: PlannerPlacedModule[]; collisions: PlannerCollision[]; warning?: string } {
  const created = createPlacedModule(spec, position, grid.config, rules, options);
  const modules = [...placed, created];
  const collisions = detectCollisions(modules);
  if (collisions.length && !options?.allowOverlap) {
    return {
      modules: placed,
      collisions,
      warning: `Colisão ao colocar ${spec.id} — posição rejeitada.`,
    };
  }
  return { modules, collisions };
}
