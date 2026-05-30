import { useMemo } from "react";
import type { InternalMeasurementEntry, ProjectActions } from "../projectTypes";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";

export type InternalMeasurementActions = Pick<
  ProjectActions,
  | "addInternalMeasurement"
  | "removeInternalMeasurement"
  | "toggleInternalMeasurementVisibility"
  | "showAllInternalMeasurements"
  | "hideAllInternalMeasurements"
  | "clearInternalMeasurements"
>;

function updateInternalMeasurements(
  ctx: ProjectActionsExecutionContext,
  updater: (_entries: InternalMeasurementEntry[]) => InternalMeasurementEntry[],
  pushUndo = true
): void {
  ctx.updateProject(
    (prev) => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        internal: updater(prev.measurements?.internal ?? []),
      },
    }),
    pushUndo
  );
}

export function useInternalMeasurementActions(
  ctx: ProjectActionsExecutionContext
): InternalMeasurementActions {
  return useMemo(() => {
    const a = {} as InternalMeasurementActions;

    a.addInternalMeasurement = (entry) => {
      updateInternalMeasurements(ctx, (entries) => {
        if (entries.some((e) => e.id === entry.id)) return entries;
        return [...entries, entry];
      });
    };

    a.removeInternalMeasurement = (id) => {
      updateInternalMeasurements(ctx, (entries) => entries.filter((e) => e.id !== id));
    };

    a.toggleInternalMeasurementVisibility = (id) => {
      updateInternalMeasurements(ctx, (entries) =>
        entries.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e))
      );
    };

    a.showAllInternalMeasurements = (boxId) => {
      updateInternalMeasurements(ctx, (entries) =>
        entries.map((e) => (boxId != null && e.boxId !== boxId ? e : { ...e, visible: true }))
      );
    };

    a.hideAllInternalMeasurements = (boxId) => {
      updateInternalMeasurements(ctx, (entries) =>
        entries.map((e) => (boxId != null && e.boxId !== boxId ? e : { ...e, visible: false }))
      );
    };

    a.clearInternalMeasurements = (boxId) => {
      updateInternalMeasurements(ctx, (entries) =>
        boxId != null ? entries.filter((e) => e.boxId !== boxId) : []
      );
    };

    return a;
  }, [ctx]);
}
