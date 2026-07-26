/**
 * plannerState.ts — Estado do Kitchen Planner (modo cliente).
 */

import { buildKitchenLibrary, type KitchenLibrary } from "../kitchen";
import { buildPlannerGrid, type PlannerGrid } from "./plannerGrid";
import {
  addModuleToPlan,
  autoAlignBaseRow,
  detectCollisions,
  findModuleSpec,
  movePlacedModule,
  type PlannerPlacedModule,
} from "./plannerModules";
import { buildPlacementRules, type PlannerPlacementRules } from "./plannerPlacement";
import { buildPlannerMeasurements, type PlannerMeasurements } from "./plannerMeasurements";
import { buildPlannerPricing, type PlannerPricingSummary } from "./plannerPricing";
import { buildPlannerExport, type PlannerExportPackage } from "./plannerExport";
import { buildPlannerReport, type PlannerReport } from "./plannerReport";

export type PlannerState = {
  library: KitchenLibrary;
  grid: PlannerGrid;
  rules: PlannerPlacementRules;
  modules: PlannerPlacedModule[];
  selectedInstanceId: string | null;
  measurements: PlannerMeasurements;
  pricing: PlannerPricingSummary;
  report: PlannerReport;
};

export function createPlannerState(options?: {
  library?: KitchenLibrary;
  gridWidthMm?: number;
  gridHeightMm?: number;
}): PlannerState {
  const library = options?.library ?? buildKitchenLibrary();
  const rules = buildPlacementRules({
    rodape: library.rodape,
    remates: library.remates,
  });
  const grid = buildPlannerGrid(
    {
      widthMm: options?.gridWidthMm ?? 3600,
      heightMm: options?.gridHeightMm ?? 2400,
      depthMm: 600,
    },
    { rodapeHeightMm: rules.rodapeHeightMm }
  );

  return refreshPlannerDerived({
    library,
    grid,
    rules,
    modules: [],
    selectedInstanceId: null,
    measurements: buildPlannerMeasurements([], grid.config),
    pricing: buildPlannerPricing([], library.pricing),
    report: buildPlannerReport({ moduleCount: 0 }),
  });
}

function refreshPlannerDerived(state: PlannerState): PlannerState {
  const collisions = detectCollisions(state.modules);
  const overlay = undefined; // overlay por módulo sob demanda na UI
  const measurements = buildPlannerMeasurements(state.modules, state.grid.config, overlay);
  const pricing = buildPlannerPricing(state.modules, state.library.pricing);
  const report = buildPlannerReport({
    moduleCount: state.modules.length,
    collisions,
    measurements,
    pricing,
    industrialIntegrityOk: true,
  });
  return { ...state, measurements, pricing, report };
}

export function plannerAddModule(
  state: PlannerState,
  moduleId: string,
  position: { xMm: number; yMm: number }
): PlannerState {
  const spec = findModuleSpec(state.library.modules.all, moduleId);
  if (!spec) {
    return {
      ...state,
      report: buildPlannerReport({
        moduleCount: state.modules.length,
        errors: [`Módulo desconhecido: ${moduleId}`],
        industrialIntegrityOk: true,
      }),
    };
  }
  const front =
    state.library.fronts.find((f) => f.applicableModuleKinds.includes(spec.kind))?.id;
  const door =
    state.library.doors.find((d) => d.applicableModuleKinds.includes(spec.kind))?.id;
  const { modules, warning } = addModuleToPlan(
    state.modules,
    spec,
    position,
    state.grid,
    state.rules,
    { frontId: front, doorId: door }
  );
  const next = refreshPlannerDerived({
    ...state,
    modules,
    selectedInstanceId: modules[modules.length - 1]?.instanceId ?? state.selectedInstanceId,
  });
  if (warning) {
    next.report = {
      ...next.report,
      warnings: [...next.report.warnings, warning],
      status: next.report.status === "PLANNER_ERROR" ? "PLANNER_ERROR" : "PLANNER_WARN",
    };
  }
  return next;
}

export function plannerMoveModule(
  state: PlannerState,
  instanceId: string,
  to: { xMm: number; yMm: number }
): PlannerState {
  const modules = state.modules.map((m) =>
    m.instanceId === instanceId ? movePlacedModule(m, to, state.grid.config) : m
  );
  return refreshPlannerDerived({ ...state, modules });
}

export function plannerRemoveModule(state: PlannerState, instanceId: string): PlannerState {
  const modules = state.modules.filter((m) => m.instanceId !== instanceId);
  return refreshPlannerDerived({
    ...state,
    modules,
    selectedInstanceId:
      state.selectedInstanceId === instanceId ? null : state.selectedInstanceId,
  });
}

export function plannerSelectModule(
  state: PlannerState,
  instanceId: string | null
): PlannerState {
  return { ...state, selectedInstanceId: instanceId };
}

export function plannerAutoAlign(state: PlannerState): PlannerState {
  const modules = autoAlignBaseRow(state.modules, state.grid.config, 0, 0);
  return refreshPlannerDerived({ ...state, modules });
}

export function plannerBuildExport(state: PlannerState): PlannerExportPackage {
  return buildPlannerExport({
    modules: state.modules,
    measurements: state.measurements,
    pricing: state.pricing,
    library: state.library,
  });
}
