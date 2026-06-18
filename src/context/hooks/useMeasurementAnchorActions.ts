import { useMemo } from "react";
import type { ProjectActions } from "../projectTypes";
import { addAnchor, removeAnchor } from "../../core/viewer/measurementAnchors";
import { historyManager } from "../../core/viewer/historyManager";
import type { ProjectActionsExecutionContext } from "./projectActionsDeps";

export type MeasurementAnchorActions = Pick<
  ProjectActions,
  "addMeasurementAnchor" | "removeMeasurementAnchor"
>;

export function useMeasurementAnchorActions(
  ctx: ProjectActionsExecutionContext
): MeasurementAnchorActions {
  const { updateProject } = ctx;

  return useMemo(() => {
    const a: MeasurementAnchorActions = {} as MeasurementAnchorActions;

    a.addMeasurementAnchor = (position, label) => {
      updateProject(
        (prev) => {
          const anchors = addAnchor(prev.measurements.anchors ?? [], position, label);
          historyManager.recordEvent("anchor.add", "Adicionar âncora");
          return {
            ...prev,
            measurements: { ...prev.measurements, anchors },
          };
        },
        true
      );
    };

    a.removeMeasurementAnchor = (anchorId) => {
      updateProject(
        (prev) => {
          const anchors = removeAnchor(prev.measurements.anchors ?? [], anchorId);
          historyManager.recordEvent("anchor.remove", "Remover âncora");
          return {
            ...prev,
            measurements: { ...prev.measurements, anchors },
          };
        },
        true
      );
    };

    return a;
  }, [updateProject]);
}
